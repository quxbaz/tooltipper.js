/**
 * tooltipper.js
 * 
 * DESCRIPTION:
 * 
 * Loads external tooltips from a JSON file and attaches them to the
 * current page.
 * 
 * USAGE:
 * 
 * Only a single function call is needed:
 *
 *   tooltipper.load_tooltips(url);
 *
 * where @url is a path to a formatted JSON file (located in /media/tooltips/).
 * 
 * EXAMPLES:
 * 
 *   tooltipped.load('account_tooltips.json');              // Load tooltips from one file.
 *   tooltipped.load(['accounts.json', 'contracts.json']);  // Load tooltips multiple files.
 *
 * DEPENDENCIES:
 * 
 * jQuery 1.6+
 * Tipped [http://projects.nickstakenburg.com/tipped]
 *
 * NOTE:
 * 
 * The current implementation caches tooltips only within this js file
 * and not across pages simply because it isn't needed. If it turns
 * out that we DO need to cache tooltips across the entire domain,
 * consider using cookies (not localStorage, which only stores
 * strings, and cannot be namespaced conveniently).
 *
 * TODO:
 *
 * Test with all browsers, especially older versions of IE.  See if
 * caching works as expected with supported browsers. See if it
 * degrades gracefully on older versions of IE.
 * 
 */

var tooltipper = new ToolTipper();

function ToolTipper() {

  // Private data

  var cache = {};
  var default_tooltip_options = {skin: 'light', maxWidth: 180};

  // Returns true if all dependencies are met. See DEPENDENCIES above.
  function has_dependencies() {
    return (typeof jQuery != 'undefined')
      && (typeof Tipped != 'undefined');
  }

  // Checks that tooltips contain all necessary properties and that all
  // properties are valid ones. Returns true if tests are passed.
  function tooltips_are_valid(url, tooltips, log_errors) {

    // Default value
    if (typeof log_errors == 'undefined') log_errors = true;

    function log_error(tooltip_name, message) {
      if (log_errors) {
        console.error('Tooltip error in "' + url + '" with "' + tooltip_name + '":\n> ' + message);
      }
    }

    var has_error = false;
    var valid_properties = ['delegates', 'selectors', 'options', 'message'];

    for (var name in tooltips) {
      var tooltip = tooltips[name];
      if (typeof tooltip.selectors == 'undefined') {
        log_error(name, "Tooltip is missing @selectors property.");
        has_error = true;
      }
      if (typeof tooltip.message == 'undefined') {
        log_error(name, "Tooltip is missing @message property.");
        has_error = true;
      }
      for (var property in tooltip) {
        if (valid_properties.indexOf(property) == -1) {
          log_error(name, '@' + property + '" is not a valid property.');
          has_error = true;
        }
        else if (property == 'selectors' && tooltip[property].length == 0) {
          log_error(name, '@selectors array is empty.');
          has_error = true;
        }
        else if (property == 'message' && tooltip[property].length == 0) {
          if (tooltip[property].length == 0) log_error(name, '@message string is empty.');
          has_error = true;
        }
      }
    }

    return !has_error;
  }

  /**
   * Attaches tooltips to elements on the page.
   * 
   * @json
   * Data fetched from a properly formatted JSON file (see /tooltips/ for
   * examples).
   */
  function attach_tooltips(json) {
    for (var tooltip in json) {
      var delegates = json[tooltip].delegates;
      var selectors = json[tooltip].selectors;
      var options = json[tooltip].options;
      var message = json[tooltip].message;
      
      var applied_options = $.extend({}, default_tooltip_options);
      if (typeof options != 'undefined') {
        $.extend(applied_options, options);
      }

      if (typeof delegates != 'undefined') {
        delegate_tooltips(delegates, selectors, message, applied_options);
      } else {
        add_tooltips(selectors, message, applied_options);
      }
    }
  }

  function create_tooltip_handler(event) {
    var $this = $(this);
    if (!$this.hasClass('tooltipped')) {
      $this.addClass('tooltipped');
      Tipped.create($this, event.data.message, event.data.options);
    }
  }

  // Tooltips an array of selectors.
  function add_tooltips(selectors, message, options) {
    var data = {message: message, options: options};
    for (var i=0; i < selectors.length; i++) {
      var $el = $(selectors[i]);
      $el.one('mouseover', data, create_tooltip_handler);
    }
  }

  // Tooltips existing and future elements.
  //
  // @delegates is an array of selectors that are delegated the function of
  // tooltipping the not-yet-existing elements filtered by @selectors.
  function delegate_tooltips(delegates, selectors, message, options) {
    var data = {message: message, options: options};
    for (var i=0; i < delegates.length; i++) {
      var $del = $(delegates[i]);
      for (var j=0; j < selectors.length; j++) {
        $(delegates[i]).delegate(selectors[j], 'mouseover', data, create_tooltip_handler);
      }
    }
  }

  // Grabs tooltips from the url and caches them.
  function fetch_tooltips(url, success) {
    function handler(json) {
      cache_tooltips(url, json);
      success();
    }
    $.getJSON(url, handler);
  };
  
  function cache_tooltips(url, json) {
    cache[url] = json;
  };

  function tooltips_in_cache(url) {
    return url in cache;
  }


  // Public data

  this.log_errors = true;
  this.tooltips_dir = '';
  // this.tooltips_dir = '/media/tooltips/';

  /**
   * Loads tooltips from either a cache or an external JSON file, and
   * attaches them to the current page. JSON files must be formatted
   * correctly for everything to work. See /media/tooltips/EXAMPLE.json
   * 
   * Before running, this function will check if all dependencies are
   * met. If not, it will fail with a console error message.
   *
   * @urls [type = string or array of strings]
   * The JSON file(s) to load tooltips from. They can be either
   * absolute paths or relative to the /media/tooltips/ directory.
   */
  this.load = function(urls) {
    if (has_dependencies()) {

      // Reassigning this function to bypass future dependency checks.
      this.load = function(urls) {

        if (!(urls instanceof Array)) urls = [urls];

        for (var i=0; i < urls.length; i++) {

          var url = urls[i];

          // Makes an absolute path out of @url if @url is relative.
          var match_json_file = /[\w\/]*\.json$/i;
          if (!((url.search(match_json_file) != -1) && url.indexOf('/') != -1)) {
            url = this.tooltips_dir + url;
          }

          // Either load cached tooltips or fetch them from the url.
          if (tooltips_in_cache(url)) {
            attach_tooltips(cache[url]);
          }
          else {
            var success = (function(url, log_errors) {
                             return function() {
                               if (tooltips_are_valid(url, cache[url], log_errors)) {
                                 attach_tooltips(cache[url]);
                               }
                             };
                           })(url, this.log_errors);
            fetch_tooltips(url, success);
          }
          
        } // END for loop
        
      }; // END this.load = function(urls) ...

      this.load(urls);
      
    } else {
      console.error('Error: One or more dependencies are missing.\nDependencies: jQuery 1.6+, Tipped');
    }
  };

}
