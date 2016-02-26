var xjs = require('xjs');
var Source = xjs.Source;
var Scene = xjs.Scene;
var sourceWindow = xjs.SourcePluginWindow.getInstance();

var socket = io.connect('http://localhost',{query:'type=source'});

var sourceName;
var mySource;
var activeScene;
var configObj = {};
var configDefDefault = {controls:false,resize:false,css:false,fields:[],groups:[]};
var fieldsDefault = {label:"",type:"text",copy:false,tip:false,default:false,output:"",group:""};
if(typeof configDef === 'undefined'){
	var configDef = [];
	configDef.fields = [];
	configDef.groups = [];
}

//Adobe Edge specific code
if(typeof AdobeEdge !== 'undefined'){
	AdobeEdge.bootstrapCallback(function (compId) {
		
		$('[title^="{"]').each(function(){
			var field = JSON.parse($(this).attr('title'));
			field.label = $(this).attr('id');
			field.label = field.label.substring(6).replace('_',' ');
			field.output = '#'+$(this).attr('id');
			field.default = $(this).text();
			configDef.fields.push(field);
		});
		configDef.fields.reverse();
		setConfigDefaults();
		setConfigObj();
	});	
}
//end Adobe edge

//START Load config from DOM
$(function(){
	if($('div[data-group]').length >0){
		$('div[data-group]').each(function(){
			var group = {};
			group = $(this).data("config");
			group.id = $(this).attr('id');
			configDef.groups.push(group);
		});
	}
	if($('div[data-config]').length >0){
		$('div[data-config]').each(function(){
			if(typeof $(this).data('group') === 'undefined'){
				var config = $(this).data("config");
				var field = {};
				if(typeof config == 'object'){
					field = config;
				}

				field.label = $(this).attr('id').replace(/_/g,' ').toProperCase();
				var fieldGroup = $(this).closest('div[data-group]');
				if(fieldGroup.length>0){
					field.group = '#'+fieldGroup.attr('id');
					var re = new RegExp("^"+fieldGroup.attr('id')+" ","i");
					field.label = field.label.replace(re,'');
				}
				field.output = '#'+$(this).attr('id');
				field.default = $(this).text();
				var fieldIndex = configDef.fields.push(field);
				$(this).data('index',fieldIndex-1);
			}
		});
	};
	setConfigDefaults();
	setConfigObj();
	
	$('div[data-config*="\\"type\\":\\"number\\""]').click(function (e){
		var field = $(this);
			if(e.which==1){
				configObj.data[field.data('index')] = parseInt(configObj.data[field.data('index')])+1;
			}
			else if(e.which==2){
				configObj.data[field.data('index')] = parseInt(configObj.data[field.data('index')])-1;
			}
			saveConfig(configObj);
			updateFields(configObj);
	});
});
//END load config from DOM

xjs.ready().then(Source.getCurrentSource)
.then(function(source){
	mySource = source;
	Scene.getActiveScene().then(function(scene){
		scene.getSceneNumber().then(function(num) {
		activeScene = num;
		});
	});
	Promise.all([mySource.getId(),mySource.getCustomName()]).then(function(values){
		sourceId = values[0];
		sourceName = values[1];
		setConfigDefaults();
		setConfigObj() ;

		socket.on(sourceName, function(data){
			configObj.data = data;
			updateFields(configObj);
		});
	});
});

function setConfigDefaults(){
	if(configDef.fields.length > 0){
		configMerge = $.extend({},configDefDefault, configDef);
		configDef.fields.forEach(function(field,i){
			configMerge.fields[i] = $.extend({},fieldsDefault, field);
		});
		configDef = configMerge;
	}
}

function setConfigObj(){
	socket.emit('xsplit_init', sourceName, function(initObj){
		var sceneId;
		var sceneName;
		var sceneInfo = {};
		mySource.getSceneId().then(function(id){
			sceneId = id;
			return Scene.getById(id).getName();
		}).then(function(name){
			sceneName = name;

			socket.emit('xsplit_def', {'source':sourceName,'def':configDef});
		});
		
		configObj.configDef = configDef;
		if(typeof initObj.data !== 'undefined'){
			configObj.data = initObj.data;
		}
		else {
				configObj.data = [];
				configDef.fields.forEach(function(value,i){
					if(typeof value.default !== 'undefined'){
						configObj.data[i] = value.default;
					}
					else {
						configObj.data[i] = "";
					}
				});
		}

	  saveConfig(configObj);
	  mySource.saveConfig(configObj);
	  updateFields(configObj);
  });
}

function updateFields(configObj){
	configObj.data.forEach(function (value, i){
		if($.isFunction(window[configDef.fields[i].output])){
			window[configDef.fields[i].output](value,configDef.fields[i]);
		}
		else {
			$(configDef.fields[i].output).html(value);
		}
		
	});
}
function saveConfig(configObj){
	  socket.emit('xsplit_update', {'source':sourceName,'data':configObj.data});
}

sourceWindow.on('save-config', function(configObj) {
	configObj.configDef = configDef;
  mySource.saveConfig(configObj);
  updateFields(configObj);
});

socket.on('xsplit_info_get',function(msg){
	
	if(msg.request == 'list_scenes'){
		var sceneNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
		var promises = sceneNumbers.map(function(number) {
		  return new Promise(function(resolve) {
			Scene.getById(number).getName().then(function(name) {
			var scene = {name:name,num:number};
			  resolve(scene);
			});
		  });
		});
		Promise.all(promises).then(function(scenes) {
			msg.scenes = scenes;
			msg.activeScene = activeScene;
			console.log(msg);
			socket.emit('xsplit_info_send',msg);
		});
	}
	if(msg.request == 'get_scene'){
		var scene = Scene.getById(msg.sceneNum);
		scene.getSources().then(function(sources){
			var promises = sources.map(function(mySource) {
				return new Promise(function(resolve) {
					Promise.all([mySource.getId(),mySource.getCustomName()]).then(function(values){
						var source = {id:values[0],name:values[1]};
						console.log(source);
						resolve(source);
					});
				});
			});
		
			Promise.all(promises).then(function(sources) {
				console.log(sources);
				msg.sources = sources;
				socket.emit('xsplit_info_send',msg);
			});
		});
	}
	
});


/*function setConfigObj() { 
	 xjs.ready()
	  .then(Source.getCurrentSource)
	  .then(function(source) {
		  mySource = source;
		return mySource.loadConfig();
	  }).then(function(configObj) {
		configObj.configDef = configDef;
		if(typeof configObj.data == 'undefined'){
			configObj.data = [];
			configDef.fields.forEach(function(value,i){
				if(typeof value.default !== 'undefined'){
					configObj.data[i] = value.default;
				}
				else {
					configObj.data[i] = "";
				}
			});
		}

		mySource.saveConfig(configObj);
		updateFields(configObj);
	  });
 }

sourceWindow.on('save-config', function(configObj) {
	configObj.configDef = configDef;
  mySource.saveConfig(configObj);
  updateFields(configObj);
});
sourceWindow.on('apply-config', function(configObj) {
	window[configObj.control]();
});



function updateFields(configObj){
	configObj.data.forEach(function (value, i){
		if($.isFunction(window[configDef.fields[i].output])){
			window[configDef.fields[i].output](value,configDef.fields[i]);
		}
		else {
			$(configDef.fields[i].output).html(value);
		}
		
	});
	if(typeof configObj.resolution !== 'undefined' && configObj.resolution.w && configObj.resolution.h){
		var rect = xjs.Rectangle.fromDimensions(configObj.resolution.w,configObj.resolution.h);
		mySource.setBrowserCustomSize(rect);
	}
	if(typeof configObj.css !== 'undefined'){
		if(configObj.css == ""){
			mySource.setCustomCSS("");
			mySource.enableCustomCSS(false);
		}
		else {

			mySource.isCustomCSSEnabled().then(function(result){
				if(!result){
					mySource.enableCustomCSS(true);
				}
				var appliedCSS = configObj.css;
				if(configObj.css.indexOf('{')<=0){
					appliedCSS = "body {"+appliedCSS+"}";
				}
				mySource.setCustomCSS(appliedCSS);
			});
			
		}
	}

	if (typeof configReady === "function") {
        	configReady();
	}
}*/

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};


