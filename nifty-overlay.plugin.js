var xjs = require('xjs');
var xsplit = xjs.Environment.isSourcePlugin();
var Source = xjs.Source;
var Scene = xjs.Scene;
var sourceWindow = xjs.SourcePluginWindow.getInstance();

var socket = io.connect('http://localhost',{query:'type=source'});

var sourceName = 'test';
var sourceId = '{1234}';
		
var mySource;
var configObj = {};
var configDefDefault = {controls:false,resize:false,css:false,fields:[],groups:[]};
var fieldsDefault = {label:"",type:"text",copy:false,tip:false,replace:false,default:false,output:"",group:""};
if(typeof configDef === 'undefined'){
	var configDef = {};
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


$(function(){
//START Load config from DOM
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
				if(typeof field.default === 'undefined'){
					field.default = $(this).html();
				}
				var fieldIndex = configDef.fields.push(field);
				$(this).data('index',fieldIndex-1);
			}
		});
	};
	if(!xsplit){
		socket.on(sourceName, function(data){
			configObj.data = data;
			updateFields(configObj);
		});
	}
//END load config from DOM	
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


function SetVolume(){}
function GetPlayState(){};
function OnSceneLoad(){};

if(xsplit){
	xjs.ready().then(Source.getCurrentSource)
	.then(function(source){
		mySource = source;
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
}

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
	socket.emit('xsplit_init', {name:sourceName,id:sourceId}, function(msg){
			socket.emit('xsplit_def', {'source':sourceName,'def':configDef});
		configObj.configDef = configDef;
		if(typeof msg.initObj.data !== 'undefined'){
			configObj.data = msg.initObj.data;
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
	  //mySource.saveConfig(configObj);
	  updateFields(configObj);
  });
}

function updateFields(configObj){
	configObj.data.forEach(function (value, i){
		if($.isFunction(window[configDef.fields[i].output])){
			window[configDef.fields[i].output](value,configDef.fields[i]);
		}
		else {
			if($.isPlainObject(configDef.fields[i].replace)){
				$.each(configDef.fields[i].replace, function( oldValue, newValue ) {
					value = value.replace(new RegExp(oldValue, 'g'), newValue);
				});
			}
			$(configDef.fields[i].output).html(value);
		}
	});
}
function saveConfig(configObj){
	  socket.emit('xsplit_update', {'source':sourceName,'data':configObj.data});
}

sourceWindow.on('save-config', function(configObj) {
	configObj.configDef = configDef;
  //mySource.saveConfig(configObj);
  updateFields(configObj);
});

socket.on('xsplit_info_get',function(msg){
	if(msg.request == 'list_scenes'){
		if(xsplit){
			mySource.getSceneId().then(function(id){
				Scene.getById(id).getName().then(function(name) {
					msg.scene = {name:name,num:id};
					socket.emit('xsplit_info_send',msg);
				});
			});
		}
		else {
			msg.scene = {name:'testScene',num:1};
			socket.emit('xsplit_info_send',msg);
		}
	}
	if(msg.request == 'get_scene_sources'){
		if(xsplit){
			mySource.getSceneId().then(function(sceneNum){
				if(msg.sceneNum == sceneNum){
					Promise.all([mySource.getId(),mySource.getCustomName()]).then(function(values){
						msg.source = {id:values[0],name:values[1]};
						socket.emit('xsplit_info_send',msg);
					});
				}
			});
		}
		else {
			msg.source = {id:sourceId,name:sourceName};
			socket.emit('xsplit_info_send',msg);
		}
	}
	
});

socket.on('connect',function(msg){
		console.log('connected');
		setConfigDefaults();
		setConfigObj();
});

socket.on('xsplit_reload',function(msg){
		console.log('reload');
		setConfigDefaults();
		setConfigObj();
});


function hide_show(value, field){
	var target = field.target;
	var effect = field.effect;
	
	value = (value==='true')
	if(value){
		switch(effect) {
		case 'slide-right':
		case 'slide-left':
		case 'slide-up':
		case 'slide-down':
			$('#'+target).css({'top':'','left':''});
			break;
		case 'fade':
			$('#'+target).css({'opacity':1});
			break;
		default: $('#'+target).show();
		}
		
	}
	else {
	switch(effect) {
		case 'slide-right':
			$('#'+target).css({'left':'-'+$('#'+target).outerWidth()+'px'});
			break;
		case 'slide-left':
			$('#'+target).css({'left':$('body').outerWidth()});
			break;
		case 'slide-up': 
			$('#'+target).css({'top':'-'+$('#'+target).outerHeight()+'px'});
			break;
		case 'slide-down':
			$('#'+target).css({'top':$('body').outerHeight()});
			break;
		case 'fade':
			$('#'+target).css({'opacity':0});
			break;
		default: $('#'+target).hide();
		}
	}
}

/*
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


