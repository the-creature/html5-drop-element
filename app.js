// Fix styles
jQuery(function() {
	//find head element and add style to current page
    jQuery('head').append('<style type="text/css">[draggable=true] {-webkit-user-drag: element; -webkit-user-select: none; -moz-user-select: none;}</style>');
});

// Fix events fix...
var originalFix = jQuery.event.fix;

jQuery.event.fix = function(event) {
    event = originalFix.apply(this, [event]);
    //check if the event  belongs to drag area.
    if( event.type.indexOf('drag') == 0 || event.type.indexOf('drop') == 0 ) {
        event.dataTransfer = event.originalEvent.dataTransfer;
    }
    return event;
}

// Add Drag&Drop handlers
jQuery.each( ("drag dragenter dragleave dragover dragend drop dragstart").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( fn ) {
		return fn ? this.bind( name, fn ) : this.trigger( name );
	};
	//check if jquery support attrFn or not.
	if ( jQuery.attrFn ) {
		jQuery.attrFn[ name ] = true;
	}
});

// used as memoty storage for transferred items
jQuery.dragData = {};

// Live draggable's && droppable's
// declare a jquery plugin
jQuery.fn.extend({
	//declare a draggable method for this plugin
    draggable: function(start, end) {
    	//listen dragging event
        this.on('dragstart dragend', function(e) {
        	//check if type of event equals 'dragstart' or not.
            if(e.type == 'dragstart' && start) {
	            jQuery.dragData = {};

               var data = start.apply(this, [e]); 
               if(data) {
                   for(var k in data) {
                       if(k == 'effect') {
                           e.dataTransfer.effectAllowed = data[k];
                       } else {
	                       // We can't use custom format of the data, so we need to check the formats
	                       // @link http://msdn.microsoft.com/en-us/library/ie/ms536744(v=vs.85).aspx
	                       if(["URL", "Text"].indexOf(k) > -1) {
		                       jQuery.dragData[k] = data[k];
		                       e.dataTransfer.setData(k, data[k]);
	                       }
                       }
                   }
               }
            }
            //check if type of event equals 'dragend' or not.
            if(e.type == 'dragend' && end) {
               end.apply(this, [e]); 
            }
            
        });
    },
	//declare a droppable method for this plugin
    droppable: function(accept, enter, leave, drop) {
        var currents = {}, uuid = 0;
        //listen the specified event    
        this.on('dragenter dragleave dragover drop', function(e) {
            if(!this.uuid) {
                this.uuid = ++uuid;
                currents[this.uuid] = {hover: false, leaveTimeout: null};
            }
            //get data from drag data.
	        e.getData = function(key){
	            if(jQuery.dragData[key]) {
		            return jQuery.dragData[key];
	            }

		        return e.dataTransfer.getData(key);
	        }

            // TODO add custom drop effect
            if(!e.dataTransfer.dropEffect && e.dataTransfer.effectAllowed) {
                switch(e.dataTransfer.effectAllowed) {
                    case 'none': e.dataTransfer.dropEffect = 'none'; break
                    case 'copy': e.dataTransfer.dropEffect = 'copy'; break
                    case 'move': e.dataTransfer.dropEffect = 'move'; break
                    case 'link': e.dataTransfer.dropEffect = 'link'; break
                    case 'copyMove': e.dataTransfer.dropEffect = 'copy'; break
                    case 'copyLink': e.dataTransfer.dropEffect = 'copy'; break
                    case 'linkMove': e.dataTransfer.dropEffect = 'move'; break
                    case 'all': e.dataTransfer.dropEffect = 'copy'; break
                }
            }

            if(e.type == 'dragenter' || e.type == 'dragover') {
                clearTimeout(currents[this.uuid].leaveTimeout);

                if(!currents[this.uuid].hover) {
                    var accepted = false;
                    if(jQuery.isFunction(accept)) {
                        accepted = accept.apply(this, [e])
                    } else {
                        var types = accept.toString().split(' ');
	                    // IE<10 doesn't provide the "types" attribute,
	                    // so we assume that we have a text and url value.
	                    // Anyway the only two supported types by IE<10.
	                    var dataTransferTypes = e.dataTransfer.types || ['text/plain', 'text/uri-list'];

	                    // IE < 11 has 'Text' or 'Url' instead of  'text/plain' or 'text/uri-list' type
	                    // so below we're converting to normal format
	                    for(var i = 0; i < dataTransferTypes.length; i++) {
		                    var dataType = dataTransferTypes[i];
		                    //some version of IE (< 10) have 'Text' type insted of  'text/plain'
		                    if(dataType.toLowerCase() == 'text') {
			                    dataTransferTypes[i] = 'text/plain';
		                    }
		                    else if(dataType.toLowerCase() == 'url') {
			                    dataTransferTypes[i] = 'text/uri-list';
		                    }
	                    }

	                    //loop the types
                        for(var i=0; i<types.length; i++) {
                            var type = types[i];
                            
                            if(type.toLowerCase() == 'text') {
                                type = 'text/plain';
                            }
                            if(type.toLowerCase() == 'url') {
                                type = 'text/uri-list';
                            }
                            if(type == '*') {
                                accepted = true;
                                break;
                            }
                            if(type == 'Files') {
                                
                                // Fix Safari Mac (seems fixed in webkit nightly)
                                for(var ii=0; ii<dataTransferTypes.length; ii++) {
                                    if('public.file-url' == dataTransferTypes[ii]) {
                                        accepted = true;
                                        break;
                                    }
                                }
                            }
                            //dataTransferTypes array holds a list of the format types of the data that is 
                            //stored for the first item, in the same order the data was added. 
                            if(dataTransferTypes) {
                                for(var ii=0; ii<dataTransferTypes.length; ii++) {
                                    if(type == dataTransferTypes[ii]) {
                                        accepted = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    //check if the dragged element accepted or not.
                    if(accepted) {
                    	//prevent default behavior.
                        e.preventDefault();
                        //apply enter function.
                        if(enter) enter.apply(this, [e]);
                        currents[this.uuid].hover = true;
                    }
                } else {
                    e.preventDefault();
                }
            } 
             //check if the type of event is equal 'dragleave' or not
            if(e.type == 'dragleave') {
                if(currents[this.uuid].hover) {
                    var self = this;
                    currents[this.uuid].leaveTimeout = setTimeout(function() {
                    	//apply leave function.
                        if(leave) leave.apply(self, [e]);
                        currents[self.uuid].hover = false;
                    }, 50);
                }
            }  
            //check if the type of event is equal 'drop' or not
            if(e.type == 'drop') {
                if(currents[this.uuid].hover) {
                	//invoke leave function.
                    if(leave) leave.apply(this, [e]);
                    currents[this.uuid].hover = false;
                    //invoke drop function.
                    if(drop) drop.apply(this, [e]);
                    e.preventDefault();
                }
            }
                
        });
                
    }

});


