/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is include.js; substantial portions derived
 * from XAuth code originally produced by Meebo, Inc., and provided
 * under the Apache License, Version 2.0; see http://github.com/xauth/xauth
 *
 * Contributor(s):
 *   Michael Hanson <mhanson@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
   2010-07-14
   First version of app client code
   -Michael Hanson. Mozilla

   2010-10-29
   Major revision of app client code, using jschannel for cross
   document communication.
   -Lloyd Hilaiel. Mozilla
**/

// inject into navigator.mozApps if it doesn't exist
if (!navigator.mozApps) {
  navigator.mozApps = {};
}

// inject if navigator.mozApps.install isn't defined or if
// navigator.mozApps.html5Implementation is true  (this latter check
// works around bad firefox behavior which doesn't properly
// restoring navigator.XXX to a pristine state upon reload)
if (!navigator.mozApps.install || navigator.mozApps.html5Implementation) {
  navigator.mozApps = (function() {

    ////////////////////////////////////////////////////////////
    // an inline copy of jschannel - http://github.com/mozilla/jschannel
    // this library simplifies communication with an iframe served from
    // myapps.mozillalabs.com - the "application repository"
    // START jschannel.js
    /**
     * js_channel is a very lightweight abstraction on top of
     * postMessage which defines message formats and semantics
     * to support interactions more rich than just message passing
     * js_channel supports:
     *  + query/response - traditional rpc
     *  + query/update/response - incremental async return of results
     *    to a query
     *  + notifications - fire and forget
     *  + error handling
     *
     * js_channel is based heavily on json-rpc, but is focused at the
     * problem of inter-iframe RPC.
     *
     * Message types:
     *  There are 5 types of messages that can flow over this channel,
     *  and you may determine what type of message an object is by
     *  examining its parameters:
     *  1. Requests
     *    + integer id
     *    + string method
     *    + (optional) any params
     *  2. Callback Invocations (or just "Callbacks")
     *    + integer id
     *    + string callback
     *    + (optional) params
     *  3. Error Responses (or just "Errors)
     *    + integer id
     *    + string error
     *    + (optional) string message
     *  4. Responses
     *    + integer id
     *    + (optional) any result
     *  5. Notifications
     *    + string method
     *    + (optional) any params
     */

    var Channel = (function() {
        // current transaction id, start out at a random *odd* number between 1 and a million
        // There is one current transaction counter id per page, and it's shared between
        // channel instances.  That means of all messages posted from a single javascript
        // evaluation context, we'll never have two with the same id.
        var s_curTranId = Math.floor(Math.random()*1000001);

        // no two bound channels in the same javascript evaluation context may have the same origin & scope.
        // futher if two bound channels have the same scope, they may not have *overlapping* origins
        // (either one or both support '*').  This restriction allows a single onMessage handler to efficiently
        // route messages based on origin and scope.  The s_boundChans maps origins to scopes, to message
        // handlers.  Request and Notification messages are routed using this table.
        // Finally, channels are inserted into this table when built, and removed when destroyed.
        var s_boundChans = { };

        // add a channel to s_boundChans, throwing if a dup exists
        function s_addBoundChan(origin, scope, handler) {
            // does she exist?
            var exists = false;
            if (origin === '*') {
                // we must check all other origins, sadly.
                for (var k in s_boundChans) {
                    if (!s_boundChans.hasOwnProperty(k)) continue;
                    if (k === '*') continue;
                    if (typeof s_boundChans[k][scope] === 'object') {
                        exists = true;
                    }
                }
            } else {
                // we must check only '*'
                if ((s_boundChans['*'] && s_boundChans['*'][scope]) ||
                    (s_boundChans[origin] && s_boundChans[origin][scope]))
                {
                    exists = true;
                }
            }
            if (exists) throw "A channel already exists which overlaps with origin '"+ origin +"' and has scope '"+scope+"'";

            if (typeof s_boundChans[origin] != 'object') s_boundChans[origin] = { };
            s_boundChans[origin][scope] = handler;
        }

        function s_removeBoundChan(origin, scope) {
            delete s_boundChans[origin][scope];
            // possibly leave a empty object around.  whatevs.
        }

        function s_isArray(obj) {
          if (Array.isArray) return Array.isArray(obj);
          else {
            return (obj.constructor.toString().indexOf("Array") != -1);
          }
        }

        // No two outstanding outbound messages may have the same id, period.  Given that, a single table
        // mapping "transaction ids" to message handlers, allows efficient routing of Callback, Error, and
        // Response messages.  Entries are added to this table when requests are sent, and removed when
        // responses are received.
        var s_transIds = { };

        // class singleton onMessage handler
        // this function is registered once and all incoming messages route through here.  This
        // arrangement allows certain efficiencies, message data is only parsed once and dispatch
        // is more efficient, especially for large numbers of simultaneous channels.
        var s_onMessage = function(e) {
            var m = JSON.parse(e.data);
            if (typeof m !== 'object') return;

            var o = e.origin;
            var s = null;
            var i = null;
            var meth = null;

            if (typeof m.method === 'string') {
                var ar = m.method.split('::');
                if (ar.length == 2) {
                    s = ar[0];
                    meth = ar[1];
                } else {
                    meth = m.method;
                }
            }

            if (typeof m.id !== 'undefined') i = m.id;

            // o is message origin
            // m is parsed message
            // s is message scope
            // i is message id (or null)
            // meth is unscoped method name
            // ^^ based on these factors we can route the message

            // if it has a method it's either a notification or a request,
            // route using s_boundChans
            if (typeof meth === 'string') {
                if (s_boundChans[o] && s_boundChans[o][s]) {
                    s_boundChans[o][s](o, meth, m);
                } else if (s_boundChans['*'] && s_boundChans['*'][s]) {
                    s_boundChans['*'][s](o, meth, m);
                }
            }
            // otherwise it must have an id (or be poorly formed
            else if (typeof i != 'undefined') {
                if (s_transIds[i]) s_transIds[i](o, meth, m);
            }
        };

        // Setup postMessage event listeners
        if (window.addEventListener) window.addEventListener('message', s_onMessage, false);
        else if(window.attachEvent) window.attachEvent('onmessage', s_onMessage);

        /* a messaging channel is constructed from a window and an origin.
         * the channel will assert that all messages received over the
         * channel match the origin
         *
         * Arguments to Channel.build(cfg):
         *
         *   cfg.window - the remote window with which we'll communication
         *   cfg.origin - the expected origin of the remote window, may be '*'
         *                which matches any origin
         *   cfg.scope  - the 'scope' of messages.  a scope string that is
         *                prepended to message names.  local and remote endpoints
         *                of a single channel must agree upon scope. Scope may
         *                not contain double colons ('::').
         *   cfg.debugOutput - A boolean value.  If true and window.console.log is
         *                a function, then debug strings will be emitted to that
         *                function.
         *   cfg.debugOutput - A boolean value.  If true and window.console.log is
         *                a function, then debug strings will be emitted to that
         *                function.
         *   cfg.postMessageObserver - A function that will be passed two arguments,
         *                an origin and a message.  It will be passed these immediately
         *                before messages are posted.
         *   cfg.gotMessageObserver - A function that will be passed two arguments,
         *                an origin and a message.  It will be passed these arguments
         *                immediately after they pass scope and origin checks, but before
         *                they are processed.
         *   cfg.onReady - A function that will be invoked when a channel becomes "ready",
         *                this occurs once both sides of the channel have been
         *                instantiated and an application level handshake is exchanged.
         *                the onReady function will be passed a single argument which is
         *                the channel object that was returned from build().
         */
        return {
            build: function(cfg) {
                var debug = function(m) {
                    if (cfg.debugOutput && window.console && window.console.log) {
                        // try to stringify, if it doesn't work we'll let javascript's built in toString do its magic
                        try { if (typeof m !== 'string') m = JSON.stringify(m); } catch(e) { }
                        console.log("["+chanId+"] " + m);
                    }
                }

                /* browser capabilities check */
                if (!window.postMessage) throw("jschannel cannot run this browser, no postMessage");
                if (!window.JSON || !window.JSON.stringify || ! window.JSON.parse) {
                    throw("jschannel cannot run this browser, no JSON parsing/serialization");
                }

                /* basic argument validation */
                if (typeof cfg != 'object') throw("Channel build invoked without a proper object argument");

                if (!cfg.window || !cfg.window.postMessage) throw("Channel.build() called without a valid window argument");

                /* we'd have to do a little more work to be able to run multiple channels that intercommunicate the same
                 * window...  Not sure if we care to support that */
                if (window === cfg.window) throw("target window is same as present window -- not allowed");

                // let's require that the client specify an origin.  if we just assume '*' we'll be
                // propagating unsafe practices.  that would be lame.
                var validOrigin = false;
                if (typeof cfg.origin === 'string') {
                    var oMatch;
                    if (cfg.origin === "*") validOrigin = true;
                    // allow valid domains under http and https.  Also, trim paths off otherwise valid origins.
                    else if (null !== (oMatch = cfg.origin.match(/^https?:\/\/(?:[-a-zA-Z0-9\.])+(?::\d+)?/))) {
                        cfg.origin = oMatch[0];
                        validOrigin = true;
                    }
                }

                if (!validOrigin) throw ("Channel.build() called with an invalid origin");

                if (typeof cfg.scope !== 'undefined') {
                    if (typeof cfg.scope !== 'string') throw 'scope, when specified, must be a string';
                    if (cfg.scope.split('::').length > 1) throw "scope may not contain double colons: '::'"
                }

                /* private variables */
                // generate a random and psuedo unique id for this channel
                var chanId = (function () {
                    var text = "";
                    var alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                    for(var i=0; i < 5; i++) text += alpha.charAt(Math.floor(Math.random() * alpha.length));
                    return text;
                })();

                // registrations: mapping method names to call objects
                var regTbl = { };
                // current oustanding sent requests
                var outTbl = { };
                // current oustanding received requests
                var inTbl = { };
                // are we ready yet?  when false we will block outbound messages.
                var ready = false;
                var pendingQueue = [ ];

                var createTransaction = function(id,origin,callbacks) {
                    var shouldDelayReturn = false;
                    var completed = false;

                    return {
                        origin: origin,
                        invoke: function(cbName, v) {
                            // verify in table
                            if (!inTbl[id]) throw "attempting to invoke a callback of a non-existant transaction: " + id;
                            // verify that the callback name is valid
                            var valid = false;
                            for (var i = 0; i < callbacks.length; i++) if (cbName === callbacks[i]) { valid = true; break; }
                            if (!valid) throw "request supports no such callback '" + cbName + "'";

                            // send callback invocation
                            postMessage({ id: id, callback: cbName, params: v});
                        },
                        error: function(error, message) {
                            completed = true;
                            // verify in table
                            if (!inTbl[id]) throw "error called for non-existant message: " + id;

                            // remove transaction from table
                            delete inTbl[id];

                            // send error
                            postMessage({ id: id, error: error, message: message });
                        },
                        complete: function(v) {
                            completed = true;
                            // verify in table
                            if (!inTbl[id]) throw "complete called for non-existant message: " + id;
                            // remove transaction from table
                            delete inTbl[id];
                            // send complete
                            postMessage({ id: id, result: v });
                        },
                        delayReturn: function(delay) {
                            if (typeof delay === 'boolean') {
                                shouldDelayReturn = (delay === true);
                            }
                            return shouldDelayReturn;
                        },
                        completed: function() {
                            return completed;
                        }
                    };
                }

                var onMessage = function(origin, method, m) {
                    // if an observer was specified at allocation time, invoke it
                    if (typeof cfg.gotMessageObserver === 'function') {
                        // pass observer a clone of the object so that our
                        // manipulations are not visible (i.e. method unscoping).
                        // This is not particularly efficient, but then we expect
                        // that message observers are primarily for debugging anyway.
                        try {
                            cfg.gotMessageObserver(origin, m);
                        } catch (e) {
                            debug("gotMessageObserver() raised an exception: " + e.toString());
                        }
                    }

                    // now, what type of message is this?
                    if (m.id && method) {
                        // a request!  do we have a registered handler for this request?
                        if (regTbl[method]) {
                            var trans = createTransaction(m.id, origin, m.callbacks ? m.callbacks : [ ]);
                            inTbl[m.id] = { };
                            try {
                                // callback handling.  we'll magically create functions inside the parameter list for each
                                // callback
                                if (m.callbacks && s_isArray(m.callbacks) && m.callbacks.length > 0) {
                                    for (var i = 0; i < m.callbacks.length; i++) {
                                        var path = m.callbacks[i];
                                        var obj = m.params;
                                        var pathItems = path.split('/');
                                        for (var j = 0; j < pathItems.length - 1; j++) {
                                            var cp = pathItems[j];
                                            if (typeof obj[cp] !== 'object') obj[cp] = { };
                                            obj = obj[cp];
                                        }
                                        obj[pathItems[pathItems.length - 1]] = (function() {
                                            var cbName = path;
                                            return function(params) {
                                                return trans.invoke(cbName, params);
                                            }
                                        })();
                                    }
                                }
                                var resp = regTbl[method](trans, m.params);
                                if (!trans.delayReturn() && !trans.completed()) trans.complete(resp);
                            } catch(e) {
                                // automagic handling of exceptions:
                                var error = "runtime_error";
                                var message = null;
                                // * if its a string then it gets an error code of 'runtime_error' and string is the message
                                if (typeof e === 'string') {
                                    message = e;
                                } else if (typeof e === 'object') {
                                    // either an array or an object
                                    // * if its an array of length two, then  array[0] is the code, array[1] is the error message
                                    if (e && s_isArray(e) && e.length == 2) {
                                        error = e[0];
                                        message = e[1];
                                    }
                                    // * if its an object then we'll look form error and message parameters
                                    else if (typeof e.error === 'string') {
                                        error = e.error;
                                        if (!e.message) message = "";
                                        else if (typeof e.message === 'string') message = e.message;
                                        else e = e.message; // let the stringify/toString message give us a reasonable verbose error string
                                    }
                                }

                                // message is *still* null, let's try harder
                                if (message === null) {
                                    try {
                                        message = JSON.stringify(e);
                                    } catch (e2) {
                                        message = e.toString();
                                    }
                                }

                                trans.error(error,message);
                            }
                        }
                    } else if (m.id && m.callback) {
                        if (!outTbl[m.id] ||!outTbl[m.id].callbacks || !outTbl[m.id].callbacks[m.callback])
                        {
                            debug("ignoring invalid callback, id:"+m.id+ " (" + m.callback +")");
                        } else {
                            // XXX: what if client code raises an exception here?
                            outTbl[m.id].callbacks[m.callback](m.params);
                        }
                    } else if (m.id) {
                        if (!outTbl[m.id]) {
                            debug("ignoring invalid response: " + m.id);
                        } else {
                            // XXX: what if client code raises an exception here?
                            if (m.error) {
                                (1,outTbl[m.id].error)(m.error, m.message);
                            } else {
                              if (m.result !== undefined) (1,outTbl[m.id].success)(m.result);
                              else (1,outTbl[m.id].success)();
                            }
                            delete outTbl[m.id];
                            delete s_transIds[m.id];
                        }
                    } else if (method) {
                        // tis a notification.
                        if (regTbl[method]) {
                            // yep, there's a handler for that.
                            // transaction is null for notifications.
                            regTbl[method](null, m.params);
                            // if the client throws, we'll just let it bubble out
                            // what can we do?  Also, here we'll ignore return values
                        }
                    }
                }

                // now register our bound channel for msg routing
                s_addBoundChan(cfg.origin, ((typeof cfg.scope === 'string') ? cfg.scope : ''), onMessage);

                // scope method names based on cfg.scope specified when the Channel was instantiated
                var scopeMethod = function(m) {
                    if (typeof cfg.scope === 'string' && cfg.scope.length) m = [cfg.scope, m].join("::");
                    return m;
                }

                // a small wrapper around postmessage whose primary function is to handle the
                // case that clients start sending messages before the other end is "ready"
                var postMessage = function(msg, force) {
                    if (!msg) throw "postMessage called with null message";

                    // delay posting if we're not ready yet.
                    var verb = (ready ? "post  " : "queue ");
                    debug(verb + " message: " + JSON.stringify(msg));
                    if (!force && !ready) {
                        pendingQueue.push(msg);
                    } else {
                        if (typeof cfg.postMessageObserver === 'function') {
                            try {
                                cfg.postMessageObserver(cfg.origin, msg);
                            } catch (e) {
                                debug("postMessageObserver() raised an exception: " + e.toString());
                            }
                        }

                        cfg.window.postMessage(JSON.stringify(msg), cfg.origin);
                    }
                }

                var onReady = function(trans, type) {
                    debug('ready msg received');
                    if (ready) throw "received ready message while in ready state.  help!";

                    if (type === 'ping') {
                        chanId += '-R';
                    } else {
                        chanId += '-L';
                    }

                    obj.unbind('__ready'); // now this handler isn't needed any more.
                    ready = true;
                    debug('ready msg accepted.');

                    if (type === 'ping') {
                        obj.notify({ method: '__ready', params: 'pong' });
                    }

                    // flush queue
                    while (pendingQueue.length) {
                        postMessage(pendingQueue.pop());
                    }

                    // invoke onReady observer if provided
                    if (typeof cfg.onReady === 'function') cfg.onReady(obj);
                };

                var obj = {
                    // tries to unbind a bound message handler.  returns false if not possible
                    unbind: function (method) {
                        if (regTbl[method]) {
                            if (!(delete regTbl[method])) throw ("can't delete method: " + method);
                            return true;
                        }
                        return false;
                    },
                    bind: function (method, cb) {
                        if (!method || typeof method !== 'string') throw "'method' argument to bind must be string";
                        if (!cb || typeof cb !== 'function') throw "callback missing from bind params";

                        if (regTbl[method]) throw "method '"+method+"' is already bound!";
                        regTbl[method] = cb;
                    },
                    call: function(m) {
                        if (!m) throw 'missing arguments to call function';
                        if (!m.method || typeof m.method !== 'string') throw "'method' argument to call must be string";
                        if (!m.success || typeof m.success !== 'function') throw "'success' callback missing from call";

                        // now it's time to support the 'callback' feature of jschannel.  We'll traverse the argument
                        // object and pick out all of the functions that were passed as arguments.
                        var callbacks = { };
                        var callbackNames = [ ];

                        var pruneFunctions = function (path, obj) {
                            if (typeof obj === 'object') {
                                for (var k in obj) {
                                    if (!obj.hasOwnProperty(k)) continue;
                                    var np = path + (path.length ? '/' : '') + k;
                                    if (typeof obj[k] === 'function') {
                                        callbacks[np] = obj[k];
                                        callbackNames.push(np);
                                        delete obj[k];
                                    } else if (typeof obj[k] === 'object') {
                                        pruneFunctions(np, obj[k]);
                                    }
                                }
                            }
                        };
                        pruneFunctions("", m.params);

                        // build a 'request' message and send it
                        var msg = { id: s_curTranId, method: scopeMethod(m.method), params: m.params };
                        if (callbackNames.length) msg.callbacks = callbackNames;

                        // insert into the transaction table
                        outTbl[s_curTranId] = { callbacks: callbacks, error: m.error, success: m.success };
                        s_transIds[s_curTranId] = onMessage;

                        // increment current id
                        s_curTranId++;

                        postMessage(msg);
                    },
                    notify: function(m) {
                        if (!m) throw 'missing arguments to notify function';
                        if (!m.method || typeof m.method !== 'string') throw "'method' argument to notify must be string";

                        // no need to go into any transaction table
                        postMessage({ method: scopeMethod(m.method), params: m.params });
                    },
                    destroy: function () {
                        s_removeBoundChan(cfg.origin, ((typeof cfg.scope === 'string') ? cfg.scope : ''));
                        if (window.removeEventListener) window.removeEventListener('message', onMessage, false);
                        else if(window.detachEvent) window.detachEvent('onmessage', onMessage);
                        ready = false;
                        regTbl = { };
                        inTbl = { };
                        outTbl = { };
                        cfg.origin = null;
                        pendingQueue = [ ];
                        debug("channel destroyed");
                        chanId = "";
                    }
                };

                obj.bind('__ready', onReady);
                setTimeout(function() {
                    postMessage({ method: scopeMethod('__ready'), params: "ping" }, true);
                }, 0);

                return obj;
            }
        };
    })();
    // END jschannel.js
    ////////////////////////////////////////////////////////////

    // This controls whether functions are available that should only be
    // available in "testing" mode, like functions to set the repo origin
    // and set the repo testing mode response.  This value must be changed
    // at the source level (i.e., rewriting the following line):
    var TESTING_MODE = false;

    // Reference shortcut so minifier can save on characters
    var win = window;

    var AppRepositoryOrigin = "https://myapps.mozillalabs.com";
    var AppRepositoryIncludePath = "/jsapi/include.html";

    // Cached references
    var iframe = null;

    // The jschannel to the applicaiton repositiory
    var chan = null;

    // Any watchUpdates() callbacks
    var watchUpdateCallbacks = {};
    var watchUpdateCounter = 1;

    /* const */
    var overlayId = "myappsOrgInstallOverlay"; /* const */
    var dialogId = "myappsTrustedIFrame";

    function showInstallDialog() {
      try {
        hideInstallDialog();
      } catch (e) {};
      // create a opacity overlay to focus the users attention
      var od = document.createElement("div");
      od.id = overlayId;
      od.style.background = "#000";
      od.style.opacity = ".66";
      od.style.filter = "alpha(opacity=66)";
      od.style.position = "fixed";
      od.style.top = "0";
      od.style.left = "0";
      od.style.height = "100%";
      od.style.width = "100%";
      od.style.zIndex = "998";
      document.body.appendChild(od);
      document.getElementById(dialogId).style.display = "inline";
    }

    function hideInstallDialog() {
      document.getElementById(dialogId).style.display = "none";
      document.body.removeChild(document.getElementById(overlayId));
    }

    // Called once on first command to create the iframe to myapps.mozillalabs.com


    function isMobile() {
      // FIXME: this doesn't detect mobile Firefox, but I'm not sure that
      // mobile Firefox has the same issues (it could though)
      var ua = navigator.userAgent;
      if (ua.search(/AppleWebKit/) == -1) {
        return false;
      }
      return ua.search(/iPhone|iPod|Android/) != -1;
    }

    function setupWindow() {
      if (iframe) {
        return;
      }

      // Create hidden iframe dom element
      var doc = win.document;
      iframe = document.createElement("iframe");
      iframe.id = dialogId;
      if (isMobile()) {
        iframe.style.position = "absolute";
      } else {
        iframe.style.position = "fixed";
      }
      iframe.style.left = "50%";
      if (isMobile()) {
        iframe.style.top = (window.pageYOffset + 166) + 'px';
      } else {
        iframe.style.top = "40%";
      }
      iframe.style.width = "410px";
      iframe.style.marginLeft = "-205px"; // half of the previous value
      iframe.style.height = "332px";
      iframe.style.marginTop = "-166px"; // half of the previous value
      iframe.style.zIndex = "999";
      iframe.style.opacity = "1";

      iframe.style.border = "2px solid #aaaaaa";

      iframe.style.MozBorderRadius = "8px";
      iframe.style.WebkitBorderRadius = "8px";
      iframe.style.borderRadius = "8px 8px 8px 8px";

      // the "hidden" part
      iframe.style.display = "none";

      // Append iframe to the dom and load up myapps.mozillalabs.com inside
      doc.body.appendChild(iframe);
      iframe.src = AppRepositoryOrigin + AppRepositoryIncludePath;

      chan = Channel.build({
        window: iframe.contentWindow,
        origin: "*",
        scope: "openwebapps"
      });

      // occasionally the application repository will request that we show/hide
      // its iframe content.
      // NOTE:  eventually we should probably be opening a new window from
      // inside the repo to mitigate clickjacking risks
      chan.bind("showme", function(trans, args) {
        // Cache the reference to the iframe window object
        showInstallDialog();
      });

      chan.bind("hideme", function(trans, args) {
        hideInstallDialog();
      });
    }

    // package up and deliver an error to the callback provided.  if the callback
    // is undefined, throw!


    function deliverError(code, message, onerror) {
      var errObj = {
        code: code,
        message: message
      };
      if (typeof onerror === 'function') {
        onerror.call(undefined, errObj);
      } else {
        throw errObj; // what else can we do?
      }
    }

    function callInstall(url, install_data, onsuccess, onerror) {
      if (url === undefined) {
        throw "install missing required url argument";
      }
      if (typeof url !== 'string') {
        throw "first (url) parameter to install() must be a string";
      }
      setupWindow();
      if (install_data === undefined) {
        install_data = null;
      }
      chan.call({
        method: "install",
        params: {
          url: url,
          install_data: install_data
        },
        error: function(error, message) {
          deliverError(error, message, onerror);
        },
        success: function() {
          if (onsuccess) {
            onsuccess();
          }
        }
      });
    }

    function callInvokeService(name, args, onsuccess, onerror) {
      setupWindow();
      if (!args) {
        args = {};
      } else {
        if (typeof(args) !== 'object') {
          throw "parameter to invokeService() must be an object";
        }
      }
      if (typeof(name) !== 'string' || name.length === 0) {
        throw "invokeService missing required name argument";
      }

      chan.call({
        method: "invokeService",
        params: {
          name: name,
          args: args
        },
        error: function(error, message) {
          deliverError(error, message, onerror);
        },
        success: function(v) {
          if (onsuccess) {
            onsuccess(v);
          }
        }
      });
    }

    function callAmInstalled(onsuccess, onerror) {
      setupWindow();
      chan.call({
        method: "amInstalled",
        error: function(error, message) {
          deliverError(error, message, onerror);
        },
        success: function(v) {
          if (onsuccess !== undefined) onsuccess(v);
        }
      });
    }

    function callGetInstalledBy(onsuccess, onerror) {
      setupWindow();
      chan.call({
        method: "getInstalledBy",
        error: function(error, message) {
          deliverError(error, message, onerror);
        },
        success: function(v) {
          if (onsuccess !== undefined) onsuccess(v);
        }
      });
    }

    // specifically to avoid popup blockers, launch must be called in an event handler
    // (like, from a mouse click) because it calls window open.  Further, we must turn
    // an id into a launch url, however we cannot call the asynchronous list function
    // to do so.  This is problematic, as launch will only work if list has been called
    // recently.  For now, upon every list invocation we cache the results and use them
    // in launch to determine launch url.
    var _lastListResults = [];

    function callLaunch(id, onsuccess, onerror) {
      // perform a quick management API check.  While this check doesn't actually
      // enforce any security, it does offer consistent error messages.  Even with the
      // removal of this check the rest of this function won't work, because it relies
      // on previous invocation of list() (to discover the launchURL).
      var loc = window.location;
      if ((loc.protocol + "//" + loc.host) !== AppRepositoryOrigin) {
        setTimeout(function() {
          deliverError("permissionDenied",
                       "to access open web apps management apis, you must be on the same domain " +
                       "as the application repository",
                       onerror);
        }, 0);
        return;
      }

      for (var i=0; i<_lastListResults.length; i++) {
        var item = _lastListResults[i];
        if (item.origin === id) {
          var url = item.origin;
          if (item.manifest.launch_path !== undefined) {
            url += item.manifest.launch_path;
          }
          // generate a deterministic and portable name for the "name" of the launced window.
          // this will prevent multiple launches of the same app from opening new windows.
          // (NOTE: IE is fairly restrictive on what characters may occur in the window name argument)
          var name = ("openwebapp_" + id).replace(/[.:]/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
          window.open(url, name);
          if (onsuccess) setTimeout(function() {
            onsuccess(true);
          }, 0);
          return;
        }
      }
      setTimeout(function() {
        deliverError("noSuchApp", "couldn't find application with id: " + id, onerror);
      }, 0);
    }

    function callList(onsuccess, onerror) {
      setupWindow();
      chan.call({
        method: "list",
        error: function(error, message) {
          deliverError(error, message, onerror);
        },
        success: function(v) {
          _lastListResults = v;
          if (onsuccess !== undefined) onsuccess(v);
        }
      });
    }

    function callUninstall(origin, onsuccess, onerror) {
      setupWindow();
      chan.call({
        method: "uninstall",
        params: origin,
        error: function(error, message) {
          deliverError(error, message, onerror);
        },
        success: function(v) {
          if (onsuccess !== undefined) onsuccess(v);
        }
      });
    }

    function callReady(args) {
    }
    
    var changeBound = false;
    
    function callWatchUpdates(callback) {
      if (! changeBound) {
        setupWindow();
        bindChange();
        changeBound = true;
      }
      var id = watchUpdateCounter++;
      watchUpdateCallbacks[id] = callback;
      return id;
    }
    
    function callClearWatch(id) {
      delete watchUpdateCallbacks[id];
    }

    function bindChange() {
      chan.bind('change', function (t, event) {
        // FIXME: check t.origin is the repository
        t.complete(true);
        for (var i in watchUpdateCallbacks) {
          if (! watchUpdateCallbacks.hasOwnProperty(i)) {
            continue;
          }
          var callback = watchUpdateCallbacks[i];
          callback(event['type'], event['objects']);
        }
      });
      // Ask the remote channel to start sending changes to us:
      chan.call({
        method: "trackChanges",
        params: {},
        success: function () {}
      });
    }
    
    function callRegisterHandler(activity, message, func) {
    }

    function callSyncButton(options) {
      return new SyncButton(options);
    }

    function SyncButton(options) {
      options = options || {};
      setupWindow();
      var iframe = document.createElement('iframe');
      iframe.style.height = '22px';
      iframe.style.width = '150px';
      iframe.scrolling = "no";
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('marginwidth', '0');
      iframe.setAttribute('marginheight', '0');
      iframe.setAttribute('id', 'syncbutton-frame');
      var url = AppRepositoryOrigin + "/jsapi/syncbutton.html";
      var params = [];
      if (options.buttonColor) {
        params.push('buttonColor=' + encodeURIComponent(options.buttonColor));
      }
      if (options.backgroundColor) {
        params.push('backgroundColor=' + encodeURIComponent(options.backgroundColor));
      }
      if (options.foregroundColor) {
        params.push('foregroundColor=' + encodeURIComponent(options.foregroundColor));
      }
      if (params.length) {
        url += '#';
        for (var i=0; i<params.length; i++) {
          if (i) {
            url += '&';
          }
          url += params[i];
        }
      }
      iframe.src = url;
      this.iframe = iframe;
      iframe.addEventListener('load', function () {
        window.addEventListener("message", function (event) {
          if (event.origin != AppRepositoryOrigin) {
            // FIXME: signal an error?
            return;
          }
          var message = JSON.parse(event.data);
          if (message.size == 'expanded') {
            iframe.style.height = '150px';
          } else if (message.size == 'compact') {
            iframe.style.height = '22px';
          }
        }, false);
        iframe.contentWindow.postMessage('hello', AppRepositoryOrigin);
      }, false);
    };
    
    SyncButton.prototype.makeCompact = function () {
      if (this.iframe.style.height == '22px') {
        return;
      }
      this.iframe.contentWindow.postMessage(JSON.stringify({size: "compact"}), AppRepositoryOrigin);
      this.iframe.style.height = '22px';
    };

    SyncButton.prototype.appendTo = function (elOrId) {
      if (typeof elOrId == 'string') {
        var el = document.getElementById(elOrId);
      } else {
        var el = elOrId;
      }
      if (! el) {
        throw 'No element found ' + elOrId;
      }
      el.appendChild(this.iframe);
    };

    // Return AppClient object with exposed API calls
    var api = {
      install: callInstall,
      invokeService: callInvokeService,
      amInstalled: callAmInstalled,
      getInstalledBy: callGetInstalledBy,
      mgmt: {
        launch: callLaunch,
        list: callList,
        uninstall: callUninstall,
        syncButton: callSyncButton,
        watchUpdates: callWatchUpdates,
        clearWatch: callClearWatch
      },
      services: {
        ready: callReady,
        registerHandler: callRegisterHandler
      },
      html5Implementation: true
    };
    if (TESTING_MODE) {
      // a debugging routine which allows debugging or testing clients
      // to point at a repository location other than production.
      // this can be a relative path or a full url.
      api.setRepoOrigin = function(o) {
        AppRepositoryOrigin = o;
      };
      api.setMockResponse = function(response, onsuccess, onerror) {
        setupWindow();
        chan.call({
          method: "setMockResponse",
          params: response,
          error: function (error, message) {
            deliverError(error, message, onerror);
          },
          success: function () {
            if (onsuccess) {
              onsuccess();
            }
          }
        });
      };
      api.setApplicationChooser = function(response, onsuccess, onerror) {
        setupWindow();
        chan.call({
          method: "setApplicationChooser",
          params: response,
          error: function (error, message) {
            deliverError(error, message, onerror);
          },
          success: function () {
            if (onsuccess) {
              onsuccess();
            }
          }
        });
      };
    }
    return api;
  })();
}
