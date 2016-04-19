//$('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'css/jquery.bootstrap-touchspin.css') );
$('head').append( $('<meta id="viewport" name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />'));
$('head').append( $('<meta name="apple-mobile-web-app-capable" content="yes">'));
$('head').append( $('<meta name="apple-mobile-web-app-status-bar-style" content="black">'));
$.getScript('js/jquery.bootstrap-touchspin.js');
function fieldsLoaded(){
$("input[type='number']").TouchSpin({
                min: 0,
                max: 100,
                step: 1,
                decimals: 0,
                booster:false,
				buttondown_class: 'btn btn-default fa fa-chevron-down',
				buttonup_class: 'btn btn-default fa fa-chevron-up',
				buttondown_txt:'',
				buttonup_txt:'',
				flip:true
             });
}