var xjs = require('xjs');
var Item = xjs.Item;
var sourceWindow = xjs.SourcePluginWindow.getInstance();
var sourceItem;
var configDefDefault = {controls:false,resize:false,css:false,fields:[],groups:[]};
var fieldsDefault = {label:"",type:"text",copy:false,tip:false,default:false,output:"",group:""};
if(typeof configDef === 'undefined'){
	var configDef = [];
	configDef.fields = [];
	configDef.groups = [];
}
setConfigDefaults();
setConfigObj() ;

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
				configDef.fields.push(field);
			}
		});
	};
	setConfigDefaults();
	setConfigObj();
	
	$('div[data-config*="\\"type\\":\\"number\\""]').click(function (){
	});
});
//END load config from DOM



function setConfigObj() { 
	 xjs.ready()
	  .then(Item.getCurrentSource)
	  .then(function(myItem) {
		  sourceItem = myItem;
		return myItem.loadConfig();
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
console.log(configObj);
		sourceItem.saveConfig(configObj);
		updateFields(configObj);
	  });
 }

sourceWindow.on('save-config', function(configObj) {
	configObj.configDef = configDef;
  sourceItem.saveConfig(configObj);
  updateFields(configObj);
});
sourceWindow.on('apply-config', function(configObj) {
	window[configObj.control]();
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
		sourceItem.setBrowserCustomSize(rect);
	}
	if(typeof configObj.css !== 'undefined'){
		if(configObj.css == ""){
			sourceItem.setCustomCSS("");
			sourceItem.enableCustomCSS(false);
		}
		else {

			sourceItem.isCustomCSSEnabled().then(function(result){
				if(!result){
					sourceItem.enableCustomCSS(true);
				}
				var appliedCSS = configObj.css;
				if(configObj.css.indexOf('{')<=0){
					appliedCSS = "body {"+appliedCSS+"}";
				}
				sourceItem.setCustomCSS(appliedCSS);
			});
			
		}
	}

	if (typeof configReady === "function") {
        	configReady();
	}
}

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};


