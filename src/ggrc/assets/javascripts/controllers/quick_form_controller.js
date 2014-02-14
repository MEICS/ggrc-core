

GGRC.Controllers.Modals("GGRC.Controllers.QuickForm", {
  defaults : {
    model : null
    , instance : null
  }
}, {

  init : function() {
    if(this.options.instance && !this.options.model) {
      this.options.model = this.options.instance.constructor;
    }
    this.options.$content = this.element;
    this.options.instance.refresh();
  }

  , "input, textarea, select change" : function(el, ev) {
    var that = this;
    if(!el.is("[data-lookup]")) {
      this.set_value_from_element(el);
      setTimeout(function() {
        that.options.instance.save();
      }, 100);
    }
  }

  , autocomplete_select : function(el, event, ui) {
    var that = this;
    if(this._super.apply(this, arguments) !== false) {
      setTimeout(function() {
        that.options.instance.save();
      }, 100);
    } else {
      return false;
    }
  }

  , "input, select, textarea click" : function(el, ev) {
    this._super && this._super.apply(this, arguments);
    ev.stopPropagation();
  }
  
  , ".dropdown-menu > li click" : function(el, ev){
    ev.stopPropagation();
    var that = this;
    this.set_value({ name: el.data('name'), value: el.data('value') });
    setTimeout(function() {
      that.options.instance.save();
      $(el).closest('.open').removeClass('open');
    }, 100);
  }
  , "button,a.undo click" : function(el, ev){
    if(!el.data('name') || !el.data('value')){
      return;
    }
    ev.stopPropagation();

    var that = this
      , name = el.data('name')
      , old_value = this.options.instance.attr(name);

    // Check if the undo button was clicked:
    this.options.instance.attr('_undo') || that.options.instance.attr('_undo', []);
    if(!el.data('undo')){
      that.options.instance.attr('_undo').unshift(old_value);
    }
    else{
      that.options.instance.attr('_undo').shift();
    }
    that.set_value({ name: el.data('name'), value: el.data('value') });
    that.options.instance.save();
  }

});