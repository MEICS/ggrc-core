$(document).ready(function(){
  
  $('[rel=tooltip]').tooltip();
  
  $('.lhs-holder').css('height', $(window).height() - 71 );
  $('.inner-nav').css('height', $(window).height() - 126 );
  $('.object-area').css('height', $(window).height() - 156 );
  $('.object-area').css('width', $(window).width() - 448 );

  
  $('body').on('click', '.info-expand a', function() {
    var $this = $(this),
        $show_hide = $this.closest('.row-fluid').next('.hidden-fields-area');
    
    if($this.hasClass("active")) {
      $show_hide.slideUp('fast');
      $this.removeClass("active");
    } else {
      $show_hide.slideDown('fast');
      $this.addClass("active");
    }
    
    return false;
    
  });
  
  $('body').on('click', '.expand-link a', function() {
    var $this = $(this),
        $show_hide = $this.closest('.row-fluid').next('.hidden-fields-area');
    
    if($this.hasClass("active")) {
      $show_hide.slideUp('fast');
      $this.removeClass("active");
    } else {
      $show_hide.slideDown('fast');
      $this.addClass("active");
    }
    
    return false;
    
  });
  
  $('body').on('click', 'ul.tree-structure .item-main .grcobject, ul.tree-structure .item-main .openclose', function(e) {
    openclose.call(this);
    e.stopPropagation();
  });

  function openclose(command) {
    var $that = $(this)
    , use_slide = $that.length < 100

    $that.each(function(){
      var $this = $(this)
        , $main = $this.closest('.item-main')
        , $li = $main.closest('li')
        , $content = $li.children('.item-content')
        , $icon = $main.find('.openclose')
        , $parentTree = $this.closest('ul.new-tree')
        , cmd = command;

      if(typeof cmd !== "string" || cmd === "toggle") {
        cmd = $icon.hasClass("active") ? "close" : "open";
      }

      if (cmd === "close") {
        
        use_slide ? $content.slideUp('fast') : $content.css("display", "none");
        $icon.removeClass('active');
        $li.removeClass('item-open');
        // Only remove tree open if there are no open siblings
        !$li.siblings('.item-open').length && $parentTree.removeClass('tree-open');
        $content.removeClass('content-open');
      } else if(cmd === "open") {
        use_slide ? $content.slideDown('fast') : $content.css("display", "block");
        $icon.addClass('active');
        $li.addClass('item-open');
        $parentTree.addClass('tree-open');
        $content.addClass('content-open');
      }
    });

    return this;
    
  }
  
  $.fn.openclose = openclose;
  
  $('body').on('click', '.advanced-filter-trigger', function() {
    var $this = $(this),
        $filters = $this.closest('.inner-tree').find('.advanced-filters');
    
    if($this.hasClass("active")) {
      $filters.slideUp('fast');
      $this.removeClass("active");
      $this.html('<i class="grcicon-search"></i> Show Filters');
    } else {
      $filters.slideDown('fast');
      $this.addClass("active");
      $this.html('<i class="grcicon-search"></i> Hide Filters');
    }
    
    return false;
    
  });
  
  $('.autogenerate').change(function(){
    $('.autogenerate-result').toggleClass('active', $(this).val() == 'control');
  });
  
  $('body').on('click', '.accordion-group a', function() {
    var $this = $(this),
        $subNav = $this.closest('.accordion-group').find('.sub-level'),
        $subAction = $this.closest('.accordion-group').find('.sub-actions');
    
    if($this.hasClass("active")) {
      $subNav.slideUp('fast');
      $subAction.slideUp('fast');
      $this.removeClass("active");
    } else {
      $subNav.slideDown('fast');
      $subAction.slideDown('fast');
      $this.addClass("active");
    }
    
    return false;
    
  });
  
  
  $('.internav li:gt(7)').hide();
  $('.add-more-objects').click(function() {
    $('.internav li:gt(7)').slideDown('fast');
    $(this).hide();
  });
  
  $( ".date" ).datepicker();
  
  $(function() {
    var people = [
      "Vladan Mitevski vladan@reciprocitylabs.com",
      "Predrag Kanazir predrag@reciprocitylabs.com",
      "Dan Ring danring@reciprocitylabs.com",
      "Silas Barta silas@reciprocitylabs.com"
    ];
    $( ".objective-selector input" ).autocomplete({
      source: people
    });
    
  });
  
  $('body').on('click', 'ul.internav li a', function() {
    var $this = $(this),
        $innerNavItem = $this.closest('li'),
        $allWidgets = $('.widget');
    
    $('ul.internav li.active').removeClass('active');
    $allWidgets.removeClass('widget-active').hide();
    
    if($innerNavItem.hasClass("active")) {
      $innerNavItem.removeClass("active");
    } else {
      $innerNavItem.addClass("active");
    }
    
    if($('ul.internav li.active a').attr('href') == '#info_widget') {
      $('#info_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#market_widget') {
      $('#market_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#control_widget') {
      $('#control_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#assessment_widget') {
      $('#assessment_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#process_widget') {
      $('#process_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#facility_widget') {
      $('#facility_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#authorization_widget') {
      $('#authorization_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#regulation_widget') {
      $('#regulation_widget').addClass('widget-active').show();
    } 
  });

  // New Assessment Created
  $('body').on('click', '#addAssessmentCreated', function() {
    $('#newAssessment').modal('hide');
    $('#assessmentCountObjectNav').html('2');
    $('#assessmentCountWidget').html('(2)');
    $('#mainAssessmentsCountNew').html('2');
    $('#addAssessment').fadeIn();
    
  });

  // New Object under Assessment Created
  $('body').on('click', '#addObjectUnderAssessmentCreated', function() {
    $('#newObjectToAssessment').modal('hide');
    $('#objectUnderAssessmentCountObjectNav').html('5');
    $('#objectItemUnderAssessmentCountObjectNav').html('5');
    $('#addObjectUnderAssessment').fadeIn();  
  });

  // Create New Task
  $('body').on('click', '#createNewTask', function() {
    $('#newTask').modal('hide');
    $('#newlyCreatedTaskTitle').html('Clean up');
    $('#newlyCreatedTask').fadeIn();
    $('#taskCounter').html('1');
  });
  
  // Create New File
  $('body').on('click', '#createNewFile', function() {
    $('#newFile').modal('hide');
    $('#newlyCreatedFile').fadeIn();
    $('#fileCounter').html('3');
  });
  
  $('body').on('click', '.show-long', function() {
    var $this = $(this),
        $description = $this.closest('.show-description').find('.tree-description');
    
    $this.hide();
    $description.removeClass('short');
    
    return false;
  });

});

// Grid View Example
var dataView;
var grid;
var data = [];
var columns = [
  {id: "title", name: "Title", field: "title", width: 330, minWidth: 120, cssClass: "cell-title", editor: Slick.Editors.Text, validator: requiredFieldValidator, sortable: true},
  {id: "assignee", name: "Assignee", field: "assignee", width: 170, minWidth: 100, cssClass: "cell-assignee", editor: Slick.Editors.Auto, sortable: true},
  {id: "status", name: "Status", field: "status", width: 140, minWidth: 80, cssClass: "cell-status", options: "Assigned,Accepted,Completed", editor: Slick.Editors.Select, sortable: true},
  {id: "due-on", name: "Due on", field: "due-on", width: 140, minWidth: 80, cssClass: "cell-due-on", editor: Slick.Editors.Date, sortable: true}
];

var options = {
  editable: true,
  enableAddRow: true,
  enableCellNavigation: true,
  asyncEditorLoading: true,
  forceFitColumns: true,
  topPanelHeight: 25,
  rowHeight: 32,
};

var sortcol = "title";
var sortdir = 1;
var percentCompleteThreshold = 0;
var searchString = "";

function requiredFieldValidator(value) {
  if (value == null || value == undefined || !value.length) {
    return {valid: false, msg: "This is a required field"};
  }
  else {
    return {valid: true, msg: null};
  }
}

function myFilter(item, args) {
  if (args.searchString != "" && item["title"].indexOf(args.searchString) == -1) {
    return false;
  }

  return true;
}

function comparer(a, b) {
  var x = a[sortcol], y = b[sortcol];
  return (x == y ? 0 : (x > y ? 1 : -1));
}

function toggleFilterRow() {
  grid.setTopPanelVisibility(!grid.getOptions().showTopPanel);
}

$(function () {
  // prepare the data
  for (var i = 0; i < 500; i++) {
    var d = (data[i] = {});

    d["id"] = "id_" + i;
    d["num"] = i;
    d["title"] = "Collect documentation " + i;
    d["assignee"] = "Cassius Clay";
    d["status"] = "Assigned";
    d["due-on"] = "Due on: 01/05/13";
  }


  dataView = new Slick.Data.DataView({inlineFilters: true});
  grid = new Slick.Grid("#myGrid", dataView, columns, options);
  grid.setSelectionModel(new Slick.RowSelectionModel());

  var pager = new Slick.Controls.Pager(dataView, grid, $("#pager"));
  var columnpicker = new Slick.Controls.ColumnPicker(columns, grid, options);


  // move the filter panel defined in a hidden div into grid top panel
  $("#inlineFilterPanel")
      .appendTo(grid.getTopPanel())
      .show();

  grid.onCellChange.subscribe(function (e, args) {
    dataView.updateItem(args.item.id, args.item);
  });

  grid.onAddNewRow.subscribe(function (e, args) {
    var item = {"num": data.length, "id": "new_" + (Math.round(Math.random() * 10000)), "title": "New task", "assignee": "Cassius Clay", "status": "Assigned", "due-on": "Due on: 01/05/13"};
    $.extend(item, args.item);
    dataView.addItem(item);
  });

  grid.onKeyDown.subscribe(function (e) {
    // select all rows on ctrl-a
    if (e.which != 65 || !e.ctrlKey) {
      return false;
    }

    var rows = [];
    for (var i = 0; i < dataView.getLength(); i++) {
      rows.push(i);
    }

    grid.setSelectedRows(rows);
    e.preventDefault();
  });

  grid.onSort.subscribe(function (e, args) {
    sortdir = args.sortAsc ? 1 : -1;
    sortcol = args.sortCol.field;

    if ($.browser.msie && $.browser.version <= 8) {
      // using temporary Object.prototype.toString override
      // more limited and does lexicographic sort only by default, but can be much faster

      var percentCompleteValueFn = function () {
        var val = this["percentComplete"];
        if (val < 10) {
          return "00" + val;
        } else if (val < 100) {
          return "0" + val;
        } else {
          return val;
        }
      };

      // use numeric sort of % and lexicographic for everything else
      dataView.fastSort((sortcol == "percentComplete") ? percentCompleteValueFn : sortcol, args.sortAsc);
    } else {
      // using native sort with comparer
      // preferred method but can be very slow in IE with huge datasets
      dataView.sort(comparer, args.sortAsc);
    }
  });

  // wire up model events to drive the grid
  dataView.onRowCountChanged.subscribe(function (e, args) {
    grid.updateRowCount();
    grid.render();
  });

  dataView.onRowsChanged.subscribe(function (e, args) {
    grid.invalidateRows(args.rows);
    grid.render();
  });

  dataView.onPagingInfoChanged.subscribe(function (e, pagingInfo) {
    var isLastPage = pagingInfo.pageNum == pagingInfo.totalPages - 1;
    var enableAddRow = isLastPage || pagingInfo.pageSize == 0;
    var options = grid.getOptions();

    if (options.enableAddRow != enableAddRow) {
      grid.setOptions({enableAddRow: enableAddRow});
    }
  });


  var h_runfilters = null;

  // wire up the slider to apply the filter to the model
  $("#pcSlider,#pcSlider2").slider({
    "range": "min",
    "slide": function (event, ui) {
      Slick.GlobalEditorLock.cancelCurrentEdit();

      if (percentCompleteThreshold != ui.value) {
        window.clearTimeout(h_runfilters);
        h_runfilters = window.setTimeout(updateFilter, 10);
        percentCompleteThreshold = ui.value;
      }
    }
  });


  // wire up the search textbox to apply the filter to the model
  $("#txtSearch,#txtSearch2").keyup(function (e) {
    Slick.GlobalEditorLock.cancelCurrentEdit();

    // clear on Esc
    if (e.which == 27) {
      this.value = "";
    }

    searchString = this.value;
    updateFilter();
  });

  function updateFilter() {
    dataView.setFilterArgs({
      searchString: searchString
    });
    dataView.refresh();
  }

  $("#btnSelectRows").click(function () {
    if (!Slick.GlobalEditorLock.commitCurrentEdit()) {
      return;
    }

    var rows = [];
    for (var i = 0; i < 10 && i < dataView.getLength(); i++) {
      rows.push(i);
    }

    grid.setSelectedRows(rows);
  });


  // initialize the model after all the events have been hooked up
  dataView.beginUpdate();
  dataView.setItems(data);
  dataView.setFilterArgs({
    searchString: searchString
  });
  dataView.setFilter(myFilter);
  dataView.endUpdate();

  // if you don't want the items that are not visible (due to being filtered out
  // or being on a different page) to stay selected, pass 'false' to the second arg
  dataView.syncGridSelection(grid, true);

  $("#gridContainer").resizable();
})
