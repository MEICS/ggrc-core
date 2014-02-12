// Returns an observable object in the current context
// This allows the helper to inject asynchronous additional content
function get_binding_observe(name, options) {
  var context,
    i = 0
    ;
  do {
    context = options.contexts[i++]
  } while (!(context instanceof can.Observe));
  if (!context.attr(name)) {
    context.attr(name, new can.Observe());
  }
  return context.attr(name);
}

function resolve_computed(maybe_computed) {
  return (typeof maybe_computed === "function" && maybe_computed.isComputed) ? maybe_computed() : maybe_computed;
}

function google_load(api_name, api_version) {
  var dfd = new can.Deferred();
  window.gapi.client.load(api_name, api_version, function(result) {
    if(!result){
      dfd.resolve();
    } else {
      dfd.reject(result);
    }
  });
  return dfd;
}

function google_plus() {
  // Load Google+ dependencies
  if (!google_plus._gapi) {
    var auth = google_plus._gapi = new can.Deferred();
    window.oauth_dfd.then(google_load('plus', 'v1')).done(function(oauth2, plus) {
      // Retrieve authenticated user
      function get_user() {
        gapi.client.oauth2.userinfo.get().execute(function(user) {
          if(user.error) {
            auth.reject(user.error);
          } else {
            auth.resolve(user);
          }
        });
      }

      // Attempt to authenticate user
      GGRC.Controllers.GAPI.authorize(['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/userinfo.email'])
      .fail(function() {
        auth.reject('auth failed');
      })
      .done(get_user);
    });
  }

  return google_plus._gapi;
}

function google_plus_user(userId) {
  if (!google_plus_user[userId]) {
    var dfd = google_plus_user[userId] = new can.Deferred();
    google_plus().done(function(gplus_user) {
      gapi.client.plus.people.get({ userId: gplus_user.id })
      .execute(function(user) {
        dfd.resolve(user);
      });
    });
  }
  return google_plus_user[userId];
};
Mustache.registerHelper("google_plus", function(person, options) {
  var state = get_binding_observe('__google_plus', options);
  person = resolve_computed(person);

  if (!state.attr('loading') && person.id === GGRC.current_user.id) {
    state.attr('loading', true);
    google_plus_user(person.id).done(function(gplus_user) {
      if (gplus_user.image && gplus_user.image.url) {
        gplus_user.image.url = gplus_user.image.url.replace(/\?sz=\d+$/, '?sz=90');
      }
      state.attr('gplus_user', gplus_user);
    });
  }

  if (state.attr('gplus_user'))
    return options.fn(state.attr('gplus_user'));
  else
    return options.inverse(options.contexts);
});
