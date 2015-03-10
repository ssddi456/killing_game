define([

],function(

){

  function cloneNodes (nodesArray, shouldCleanNodes) {
    for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
      var clonedNode = nodesArray[i].cloneNode(true);
      newNodesArray.push(shouldCleanNodes ? ko.cleanNode(clonedNode) : clonedNode);
    }
    return newNodesArray;
  }
  ko.bindingHandlers['page'] = {
    'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var didDisplayOnLastUpdate;
      var savedNodes;
      var pageKey = ko.utils.unwrapObservable(valueAccessor());
      ko.computed(function() {
        var shouldDisplay = viewModel.page() == pageKey;
        var isFirstRender = !savedNodes;
        var needsRefresh = isFirstRender || (shouldDisplay !== didDisplayOnLastUpdate);

        if (needsRefresh) {
          // Save a copy of the inner nodes on the initial update, but only if we have dependencies.
          if (isFirstRender && ko.computedContext.getDependenciesCount()) {
            savedNodes = cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
          }

          if (shouldDisplay) {
            if (!isFirstRender) {
              ko.virtualElements.setDomNodeChildren(element, cloneNodes(savedNodes));
            }
            ko.applyBindingsToDescendants(bindingContext, element);
            element.style.display = 'flex';
          } else {
            ko.virtualElements.emptyNode(element);
            element.style.display = 'none';
          }

          didDisplayOnLastUpdate = shouldDisplay;
        }
      }, null, { disposeWhenNodeIsRemoved: element });
      return { 'controlsDescendantBindings': true };
    }
  };
  // Can't rewrite control flow bindings
  ko.expressionRewriting.bindingRewriteValidators['page'] = false;
  ko.virtualElements.allowedBindings['page'] = true;

  ko.bindingHandlers.toggle = {
    'init' : function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var newValueAccessor = function () {
        var ret = {};
        var handle = valueAccessor();
        ret.click = function() {
          handle( !handle() );
        };
        return ret;
      };
      return ko.bindingHandlers['event']['init'].call(this, element, newValueAccessor, allBindings, viewModel, bindingContext);
    }
  };
  ko.bindingHandlers.simple_animate_flow = {
    'init':function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var pre_stage;
      ko.computed(function() {
        ko.utils.toggleDomNodeCssClass(element,'stage_'+pre_stage,false);
        var stage = pre_stage = ko.utils.unwrapObservable(valueAccessor());
        ko.utils.toggleDomNodeCssClass(element,'stage_'+stage,true);
      })
    }
  };
  function hooked_events ( eventName ) {
    ko.bindingHandlers['hooked_'+ eventName ]= {
      'init' : function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var newValueAccessor = function () {
          var ret = {};
          var handle = valueAccessor();
          ret[eventName] = function() {
            var can_trigger_handle = viewModel['before_' + eventName];
            var can_trigger = !can_trigger_handle || can_trigger_handle.apply(this,arguments);
            if( can_trigger ){
              handle.apply( this, arguments );
            }
          };
          return ret;
        };
        return ko.bindingHandlers['event']['init'].call(this, element, newValueAccessor, allBindings, viewModel, bindingContext);
      }
    }
  }
  hooked_events('click');
});