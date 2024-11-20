/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
;(function () {

    var async = {};
    function noop() {}
    function identity(v) {
        return v;
    }
    function toBool(v) {
        return !!v;
    }
    function notId(v) {
        return !v;
    }

    // global on the server, window in the browser
    var previous_async;

    // Establish the root object, `window` (`self`) in the browser, `global`
    // on the server, or `this` in some virtual machines. We use `self`
    // instead of `window` for `WebWorker` support.
    var root = typeof self === 'object' && self.self === self && self ||
            typeof global === 'object' && global.global === global && global ||
            this;

    if (root != null) {
        previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        return function() {
            if (fn === null) throw new Error("Callback was already called.");
            fn.apply(this, arguments);
            fn = null;
        };
    }

    function _once(fn) {
        return function() {
            if (fn === null) return;
            fn.apply(this, arguments);
            fn = null;
        };
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    // Ported from underscore.js isObject
    var _isObject = function(obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    };

    function _isArrayLike(arr) {
        return _isArray(arr) || (
            // has a positive integer length property
            typeof arr.length === "number" &&
            arr.length >= 0 &&
            arr.length % 1 === 0
        );
    }

    function _arrayEach(arr, iterator) {
        var index = -1,
            length = arr.length;

        while (++index < length) {
            iterator(arr[index], index, arr);
        }
    }

    function _map(arr, iterator) {
        var index = -1,
            length = arr.length,
            result = Array(length);

        while (++index < length) {
            result[index] = iterator(arr[index], index, arr);
        }
        return result;
    }

    function _range(count) {
        return _map(Array(count), function (v, i) { return i; });
    }

    function _reduce(arr, iterator, memo) {
        _arrayEach(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    }

    function _forEachOf(object, iterator) {
        _arrayEach(_keys(object), function (key) {
            iterator(object[key], key);
        });
    }

    function _indexOf(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) return i;
        }
        return -1;
    }

    var _keys = Object.keys || function (obj) {
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    function _keyIterator(coll) {
        var i = -1;
        var len;
        var keys;
        if (_isArrayLike(coll)) {
            len = coll.length;
            return function next() {
                i++;
                return i < len ? i : null;
            };
        } else {
            keys = _keys(coll);
            len = keys.length;
            return function next() {
                i++;
                return i < len ? keys[i] : null;
            };
        }
    }

    // Similar to ES6's rest param (http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html)
    // This accumulates the arguments passed into an array, after a given index.
    // From underscore.js (https://github.com/jashkenas/underscore/pull/2140).
    function _restParam(func, startIndex) {
        startIndex = startIndex == null ? func.length - 1 : +startIndex;
        return function() {
            var length = Math.max(arguments.length - startIndex, 0);
            var rest = Array(length);
            for (var index = 0; index < length; index++) {
                rest[index] = arguments[index + startIndex];
            }
            switch (startIndex) {
                case 0: return func.call(this, rest);
                case 1: return func.call(this, arguments[0], rest);
            }
            // Currently unused but handle cases outside of the switch statement:
            // var args = Array(startIndex + 1);
            // for (index = 0; index < startIndex; index++) {
            //     args[index] = arguments[index];
            // }
            // args[startIndex] = rest;
            // return func.apply(this, args);
        };
    }

    function _withoutIndex(iterator) {
        return function (value, index, callback) {
            return iterator(value, callback);
        };
    }

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////

    // capture the global reference to guard against fakeTimer mocks
    var _setImmediate = typeof setImmediate === 'function' && setImmediate;

    var _delay = _setImmediate ? function(fn) {
        // not a direct alias for IE10 compatibility
        _setImmediate(fn);
    } : function(fn) {
        setTimeout(function() {
            fn();
        }, 0);
    };

    if (typeof process === 'object' && typeof process.nextTick === 'function') {
        async.nextTick = process.nextTick;
    } else {
        async.nextTick = _delay;
    }
    async.setImmediate = _setImmediate ? _delay : async.nextTick;


    async.forEach =
    async.each = function (arr, iterator, callback) {
        return async.eachOf(arr, _withoutIndex(iterator), callback);
    };

    async.forEachSeries =
    async.eachSeries = function (arr, iterator, callback) {
        return async.eachOfSeries(arr, _withoutIndex(iterator), callback);
    };


    async.forEachLimit =
    async.eachLimit = function (arr, limit, iterator, callback) {
        return _eachOfLimit(limit)(arr, _withoutIndex(iterator), callback);
    };

    async.forEachOf =
    async.eachOf = function (object, iterator, callback) {
        callback = _once(callback || noop);
        object = object || [];

        var iter = _keyIterator(object);
        var key, completed = 0;

        while ((key = iter()) != null) {
            completed += 1;
            iterator(object[key], key, only_once(done));
        }

        if (completed === 0) callback(null);

        function done(err) {
            completed--;
            if (err) {
                callback(err);
            }
            // Check key is null in case iterator isn't exhausted
            // and done resolved synchronously.
            else if (key === null && completed <= 0) {
                callback(null);
            }
        }
    };

    async.forEachOfSeries =
    async.eachOfSeries = function (obj, iterator, callback) {
        callback = _once(callback || noop);
        obj = obj || [];
        var nextKey = _keyIterator(obj);
        var key = nextKey();
        function iterate() {
            var sync = true;
            if (key === null) {
                return callback(null);
            }
            iterator(obj[key], key, only_once(function (err) {
                if (err) {
                    callback(err);
                }
                else {
                    key = nextKey();
                    if (key === null) {
                        return callback(null);
                    } else {
                        if (sync) {
                            async.setImmediate(iterate);
                        } else {
                            iterate();
                        }
                    }
                }
            }));
            sync = false;
        }
        iterate();
    };



    async.forEachOfLimit =
    async.eachOfLimit = function (obj, limit, iterator, callback) {
        _eachOfLimit(limit)(obj, iterator, callback);
    };

    function _eachOfLimit(limit) {

        return function (obj, iterator, callback) {
            callback = _once(callback || noop);
            obj = obj || [];
            var nextKey = _keyIterator(obj);
            if (limit <= 0) {
                return callback(null);
            }
            var done = false;
            var running = 0;
            var errored = false;

            (function replenish () {
                if (done && running <= 0) {
                    return callback(null);
                }

                while (running < limit && !errored) {
                    var key = nextKey();
                    if (key === null) {
                        done = true;
                        if (running <= 0) {
                            callback(null);
                        }
                        return;
                    }
                    running += 1;
                    iterator(obj[key], key, only_once(function (err) {
                        running -= 1;
                        if (err) {
                            callback(err);
                            errored = true;
                        }
                        else {
                            replenish();
                        }
                    }));
                }
            })();
        };
    }


    function doParallel(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOf, obj, iterator, callback);
        };
    }
    function doParallelLimit(fn) {
        return function (obj, limit, iterator, callback) {
            return fn(_eachOfLimit(limit), obj, iterator, callback);
        };
    }
    function doSeries(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOfSeries, obj, iterator, callback);
        };
    }

    function _asyncMap(eachfn, arr, iterator, callback) {
        callback = _once(callback || noop);
        arr = arr || [];
        var results = _isArrayLike(arr) ? [] : {};
        eachfn(arr, function (value, index, callback) {
            iterator(value, function (err, v) {
                results[index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    }

    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = doParallelLimit(_asyncMap);

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.inject =
    async.foldl =
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachOfSeries(arr, function (x, i, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };

    async.foldr =
    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, identity).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };

    async.transform = function (arr, memo, iterator, callback) {
        if (arguments.length === 3) {
            callback = iterator;
            iterator = memo;
            memo = _isArray(arr) ? [] : {};
        }

        async.eachOf(arr, function(v, k, cb) {
            iterator(memo, v, k, cb);
        }, function(err) {
            callback(err, memo);
        });
    };

    function _filter(eachfn, arr, iterator, callback) {
        var results = [];
        eachfn(arr, function (x, index, callback) {
            iterator(x, function (v) {
                if (v) {
                    results.push({index: index, value: x});
                }
                callback();
            });
        }, function () {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    }

    async.select =
    async.filter = doParallel(_filter);

    async.selectLimit =
    async.filterLimit = doParallelLimit(_filter);

    async.selectSeries =
    async.filterSeries = doSeries(_filter);

    function _reject(eachfn, arr, iterator, callback) {
        _filter(eachfn, arr, function(value, cb) {
            iterator(value, function(v) {
                cb(!v);
            });
        }, callback);
    }
    async.reject = doParallel(_reject);
    async.rejectLimit = doParallelLimit(_reject);
    async.rejectSeries = doSeries(_reject);

    function _createTester(eachfn, check, getResult) {
        return function(arr, limit, iterator, cb) {
            function done() {
                if (cb) cb(getResult(false, void 0));
            }
            function iteratee(x, _, callback) {
                if (!cb) return callback();
                iterator(x, function (v) {
                    if (cb && check(v)) {
                        cb(getResult(true, x));
                        cb = iterator = false;
                    }
                    callback();
                });
            }
            if (arguments.length > 3) {
                eachfn(arr, limit, iteratee, done);
            } else {
                cb = iterator;
                iterator = limit;
                eachfn(arr, iteratee, done);
            }
        };
    }

    async.any =
    async.some = _createTester(async.eachOf, toBool, identity);

    async.someLimit = _createTester(async.eachOfLimit, toBool, identity);

    async.all =
    async.every = _createTester(async.eachOf, notId, notId);

    async.everyLimit = _createTester(async.eachOfLimit, notId, notId);

    function _findGetResult(v, x) {
        return x;
    }
    async.detect = _createTester(async.eachOf, identity, _findGetResult);
    async.detectSeries = _createTester(async.eachOfSeries, identity, _findGetResult);
    async.detectLimit = _createTester(async.eachOfLimit, identity, _findGetResult);

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                callback(null, _map(results.sort(comparator), function (x) {
                    return x.value;
                }));
            }

        });

        function comparator(left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
        }
    };

    async.auto = function (tasks, concurrency, callback) {
        if (!callback) {
            // concurrency is optional, shift the args.
            callback = concurrency;
            concurrency = null;
        }
        callback = _once(callback || noop);
        var keys = _keys(tasks);
        var remainingTasks = keys.length;
        if (!remainingTasks) {
            return callback(null);
        }
        if (!concurrency) {
            concurrency = remainingTasks;
        }

        var results = {};
        var runningTasks = 0;

        var listeners = [];
        function addListener(fn) {
            listeners.unshift(fn);
        }
        function removeListener(fn) {
            var idx = _indexOf(listeners, fn);
            if (idx >= 0) listeners.splice(idx, 1);
        }
        function taskComplete() {
            remainingTasks--;
            _arrayEach(listeners.slice(0), function (fn) {
                fn();
            });
        }

        addListener(function () {
            if (!remainingTasks) {
                callback(null, results);
            }
        });

        _arrayEach(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = _restParam(function(err, args) {
                runningTasks--;
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _forEachOf(results, function(val, rkey) {
                        safeResults[rkey] = val;
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            });
            var requires = task.slice(0, task.length - 1);
            // prevent dead-locks
            var len = requires.length;
            var dep;
            while (len--) {
                if (!(dep = tasks[requires[len]])) {
                    throw new Error('Has inexistant dependency');
                }
                if (_isArray(dep) && _indexOf(dep, k) >= 0) {
                    throw new Error('Has cyclic dependencies');
                }
            }
            function ready() {
                return runningTasks < concurrency && _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            }
            if (ready()) {
                runningTasks++;
                task[task.length - 1](taskCallback, results);
            }
            else {
                addListener(listener);
            }
            function listener() {
                if (ready()) {
                    runningTasks++;
                    removeListener(listener);
                    task[task.length - 1](taskCallback, results);
                }
            }
        });
    };



    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var DEFAULT_INTERVAL = 0;

        var attempts = [];

        var opts = {
            times: DEFAULT_TIMES,
            interval: DEFAULT_INTERVAL
        };

        function parseTimes(acc, t){
            if(typeof t === 'number'){
                acc.times = parseInt(t, 10) || DEFAULT_TIMES;
            } else if(typeof t === 'object'){
                acc.times = parseInt(t.times, 10) || DEFAULT_TIMES;
                acc.interval = parseInt(t.interval, 10) || DEFAULT_INTERVAL;
            } else {
                throw new Error('Unsupported argument type for \'times\': ' + typeof t);
            }
        }

        var length = arguments.length;
        if (length < 1 || length > 3) {
            throw new Error('Invalid arguments - must be either (task), (task, callback), (times, task) or (times, task, callback)');
        } else if (length <= 2 && typeof times === 'function') {
            callback = task;
            task = times;
        }
        if (typeof times !== 'function') {
            parseTimes(opts, times);
        }
        opts.callback = callback;
        opts.task = task;

        function wrappedTask(wrappedCallback, wrappedResults) {
            function retryAttempt(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            }

            function retryInterval(interval){
                return function(seriesCallback){
                    setTimeout(function(){
                        seriesCallback(null);
                    }, interval);
                };
            }

            while (opts.times) {

                var finalAttempt = !(opts.times-=1);
                attempts.push(retryAttempt(opts.task, finalAttempt));
                if(!finalAttempt && opts.interval > 0){
                    attempts.push(retryInterval(opts.interval));
                }
            }

            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || opts.callback)(data.err, data.result);
            });
        }

        // If a callback is passed, run this as a controll flow
        return opts.callback ? wrappedTask() : wrappedTask;
    };

    async.waterfall = function (tasks, callback) {
        callback = _once(callback || noop);
        if (!_isArray(tasks)) {
            var err = new Error('First argument to waterfall must be an array of functions');
            return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        function wrapIterator(iterator) {
            return _restParam(function (err, args) {
                if (err) {
                    callback.apply(null, [err].concat(args));
                }
                else {
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    ensureAsync(iterator).apply(null, args);
                }
            });
        }
        wrapIterator(async.iterator(tasks))();
    };

    function _parallel(eachfn, tasks, callback) {
        callback = callback || noop;
        var results = _isArrayLike(tasks) ? [] : {};

        eachfn(tasks, function (task, key, callback) {
            task(_restParam(function (err, args) {
                if (args.length <= 1) {
                    args = args[0];
                }
                results[key] = args;
                callback(err);
            }));
        }, function (err) {
            callback(err, results);
        });
    }

    async.parallel = function (tasks, callback) {
        _parallel(async.eachOf, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel(_eachOfLimit(limit), tasks, callback);
    };

    async.series = function(tasks, callback) {
        _parallel(async.eachOfSeries, tasks, callback);
    };

    async.iterator = function (tasks) {
        function makeCallback(index) {
            function fn() {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            }
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        }
        return makeCallback(0);
    };

    async.apply = _restParam(function (fn, args) {
        return _restParam(function (callArgs) {
            return fn.apply(
                null, args.concat(callArgs)
            );
        });
    });

    function _concat(eachfn, arr, fn, callback) {
        var result = [];
        eachfn(arr, function (x, index, cb) {
            fn(x, function (err, y) {
                result = result.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, result);
        });
    }
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        callback = callback || noop;
        if (test()) {
            var next = _restParam(function(err, args) {
                if (err) {
                    callback(err);
                } else if (test.apply(this, args)) {
                    iterator(next);
                } else {
                    callback(null);
                }
            });
            iterator(next);
        } else {
            callback(null);
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        var calls = 0;
        return async.whilst(function() {
            return ++calls <= 1 || test.apply(this, arguments);
        }, iterator, callback);
    };

    async.until = function (test, iterator, callback) {
        return async.whilst(function() {
            return !test.apply(this, arguments);
        }, iterator, callback);
    };

    async.doUntil = function (iterator, test, callback) {
        return async.doWhilst(iterator, function() {
            return !test.apply(this, arguments);
        }, callback);
    };

    async.during = function (test, iterator, callback) {
        callback = callback || noop;

        var next = _restParam(function(err, args) {
            if (err) {
                callback(err);
            } else {
                args.push(check);
                test.apply(this, args);
            }
        });

        var check = function(err, truth) {
            if (err) {
                callback(err);
            } else if (truth) {
                iterator(next);
            } else {
                callback(null);
            }
        };

        test(check);
    };

    async.doDuring = function (iterator, test, callback) {
        var calls = 0;
        async.during(function(next) {
            if (calls++ < 1) {
                next(null, true);
            } else {
                test.apply(this, arguments);
            }
        }, iterator, callback);
    };

    function _queue(worker, concurrency, payload) {
        if (concurrency == null) {
            concurrency = 1;
        }
        else if(concurrency === 0) {
            throw new Error('Concurrency must not be zero');
        }
        function _insert(q, data, pos, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0 && q.idle()) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    callback: callback || noop
                };

                if (pos) {
                    q.tasks.unshift(item);
                } else {
                    q.tasks.push(item);
                }

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
            });
            async.setImmediate(q.process);
        }
        function _next(q, tasks) {
            return function(){
                workers -= 1;

                var removed = false;
                var args = arguments;
                _arrayEach(tasks, function (task) {
                    _arrayEach(workersList, function (worker, index) {
                        if (worker === task && !removed) {
                            workersList.splice(index, 1);
                            removed = true;
                        }
                    });

                    task.callback.apply(task, args);
                });
                if (q.tasks.length + workers === 0) {
                    q.drain();
                }
                q.process();
            };
        }

        var workers = 0;
        var workersList = [];
        var q = {
            tasks: [],
            concurrency: concurrency,
            payload: payload,
            saturated: noop,
            empty: noop,
            drain: noop,
            started: false,
            paused: false,
            push: function (data, callback) {
                _insert(q, data, false, callback);
            },
            kill: function () {
                q.drain = noop;
                q.tasks = [];
            },
            unshift: function (data, callback) {
                _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    while(workers < q.concurrency && q.tasks.length){
                        var tasks = q.payload ?
                            q.tasks.splice(0, q.payload) :
                            q.tasks.splice(0, q.tasks.length);

                        var data = _map(tasks, function (task) {
                            return task.data;
                        });

                        if (q.tasks.length === 0) {
                            q.empty();
                        }
                        workers += 1;
                        workersList.push(tasks[0]);
                        var cb = only_once(_next(q, tasks));
                        worker(data, cb);
                    }
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            workersList: function () {
                return workersList;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                q.paused = true;
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                var resumeCount = Math.min(q.concurrency, q.tasks.length);
                // Need to call q.process once per concurrent
                // worker to preserve full concurrency after pause
                for (var w = 1; w <= resumeCount; w++) {
                    async.setImmediate(q.process);
                }
            }
        };
        return q;
    }

    async.queue = function (worker, concurrency) {
        var q = _queue(function (items, cb) {
            worker(items[0], cb);
        }, concurrency, 1);

        return q;
    };

    async.priorityQueue = function (worker, concurrency) {

        function _compareTasks(a, b){
            return a.priority - b.priority;
        }

        function _binarySearch(sequence, item, compare) {
            var beg = -1,
                end = sequence.length - 1;
            while (beg < end) {
                var mid = beg + ((end - beg + 1) >>> 1);
                if (compare(item, sequence[mid]) >= 0) {
                    beg = mid;
                } else {
                    end = mid - 1;
                }
            }
            return beg;
        }

        function _insert(q, data, priority, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    priority: priority,
                    callback: typeof callback === 'function' ? callback : noop
                };

                q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
                async.setImmediate(q.process);
            });
        }

        // Start with a normal queue
        var q = async.queue(worker, concurrency);

        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
            _insert(q, data, priority, callback);
        };

        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        return _queue(worker, 1, payload);
    };

    function _console_fn(name) {
        return _restParam(function (fn, args) {
            fn.apply(null, args.concat([_restParam(function (err, args) {
                if (typeof console === 'object') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _arrayEach(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            })]));
        });
    }
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || identity;
        var memoized = _restParam(function memoized(args) {
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.setImmediate(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([_restParam(function (args) {
                    memo[key] = args;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                        q[i].apply(null, args);
                    }
                })]));
            }
        });
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
        return function () {
            return (fn.unmemoized || fn).apply(null, arguments);
        };
    };

    function _times(mapper) {
        return function (count, iterator, callback) {
            mapper(_range(count), iterator, callback);
        };
    }

    async.times = _times(async.map);
    async.timesSeries = _times(async.mapSeries);
    async.timesLimit = function (count, limit, iterator, callback) {
        return async.mapLimit(_range(count), limit, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return _restParam(function (args) {
            var that = this;

            var callback = args[args.length - 1];
            if (typeof callback == 'function') {
                args.pop();
            } else {
                callback = noop;
            }

            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([_restParam(function (err, nextargs) {
                    cb(err, nextargs);
                })]));
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        });
    };

    async.compose = function (/* functions... */) {
        return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };


    function _applyEach(eachfn) {
        return _restParam(function(fns, args) {
            var go = _restParam(function(args) {
                var that = this;
                var callback = args.pop();
                return eachfn(fns, function (fn, _, cb) {
                    fn.apply(that, args.concat([cb]));
                },
                callback);
            });
            if (args.length) {
                return go.apply(this, args);
            }
            else {
                return go;
            }
        });
    }

    async.applyEach = _applyEach(async.eachOf);
    async.applyEachSeries = _applyEach(async.eachOfSeries);


    async.forever = function (fn, callback) {
        var done = only_once(callback || noop);
        var task = ensureAsync(fn);
        function next(err) {
            if (err) {
                return done(err);
            }
            task(next);
        }
        next();
    };

    function ensureAsync(fn) {
        return _restParam(function (args) {
            var callback = args.pop();
            args.push(function () {
                var innerArgs = arguments;
                if (sync) {
                    async.setImmediate(function () {
                        callback.apply(null, innerArgs);
                    });
                } else {
                    callback.apply(null, innerArgs);
                }
            });
            var sync = true;
            fn.apply(this, args);
            sync = false;
        });
    }

    async.ensureAsync = ensureAsync;

    async.constant = _restParam(function(values) {
        var args = [null].concat(values);
        return function (callback) {
            return callback.apply(this, args);
        };
    });

    async.wrapSync =
    async.asyncify = function asyncify(func) {
        return _restParam(function (args) {
            var callback = args.pop();
            var result;
            try {
                result = func.apply(this, args);
            } catch (e) {
                return callback(e);
            }
            // if result is Promise object
            if (_isObject(result) && typeof result.then === "function") {
                result.then(function(value) {
                    callback(null, value);
                })["catch"](function(err) {
                    callback(err.message ? err : new Error(err));
                });
            } else {
                callback(null, result);
            }
        });
    };

    // Node.js
    if (typeof module === 'object' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define === 'function' && define.amd) {
        define('async', function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

;(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('sha1',[], factory);
    } else {
        window.sha1 = factory();
    }
})(function () {

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
     * in FIPS PUB 180-1
     * Copyright (C) Paul Johnston 2000.
     * See http://pajhome.org.uk/site/legal.html for details.
     *
     * Modified by Tom Wu (tjw@cs.stanford.edu) for the
     * SRP JavaScript implementation.
     */
    var sha1 = function() {
        /*
        * Convert a 32-bit number to a hex string with ms-byte first
        */
        var hex_chr = "0123456789abcdef";

        function hex(num) {
            var str = "";
            for (var j = 7; j >= 0; j--)
                str += hex_chr.charAt((num >> (j * 4)) & 0x0F);
            return str;
        }

        /*
             * Convert a string to a sequence of 16-word blocks, stored as an array.
             * Append padding bits and the length, as described in the SHA1 standard.
             */
        function str2blks_SHA1(str) {
            var nblk = ((str.length + 8) >> 6) + 1;
            var blks = new Array(nblk * 16);
            for (var i = 0; i < nblk * 16; i++) blks[i] = 0;
            for (i = 0; i < str.length; i++)
                blks[i >> 2] |= str.charCodeAt(i) << (24 - (i % 4) * 8);
            blks[i >> 2] |= 0x80 << (24 - (i % 4) * 8);
            blks[nblk * 16 - 1] = str.length * 8;
            return blks;
        }

        /*
             * Input is in hex format - trailing odd nibble gets a zero appended.
             */
        function hex2blks_SHA1(hex) {
            var len = (hex.length + 1) >> 1;
            var nblk = ((len + 8) >> 6) + 1;
            var blks = new Array(nblk * 16);
            for (var i = 0; i < nblk * 16; i++) blks[i] = 0;
            for (i = 0; i < len; i++)
                blks[i >> 2] |= parseInt(hex.substr(2 * i, 2), 16) << (24 - (i % 4) * 8);
            blks[i >> 2] |= 0x80 << (24 - (i % 4) * 8);
            blks[nblk * 16 - 1] = len * 8;
            return blks;
        }

        function ba2blks_SHA1(ba, off, len) {
            var nblk = ((len + 8) >> 6) + 1;
            var blks = new Array(nblk * 16);
            for (var i = 0; i < nblk * 16; i++) blks[i] = 0;
            for (i = 0; i < len; i++)
                blks[i >> 2] |= (ba[off + i] & 0xFF) << (24 - (i % 4) * 8);
            blks[i >> 2] |= 0x80 << (24 - (i % 4) * 8);
            blks[nblk * 16 - 1] = len * 8;
            return blks;
        }

        /*
             * Add integers, wrapping at 2^32. This uses 16-bit operations internally 
             * to work around bugs in some JS interpreters.
             */
        function add(x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF);
            var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        }

        /*
             * Bitwise rotate a 32-bit number to the left
             */
        function rol(num, cnt) {
            return (num << cnt) | (num >>> (32 - cnt));
        }

        /*
             * Perform the appropriate triplet combination function for the current
             * iteration
             */
        function ft(t, b, c, d) {
            if (t < 20) return (b & c) | ((~b) & d);
            if (t < 40) return b ^ c ^ d;
            if (t < 60) return (b & c) | (b & d) | (c & d);
            return b ^ c ^ d;
        }

        /*
             * Determine the appropriate additive constant for the current iteration
             */
        function kt(t) {
            return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 :
            (t < 60) ? -1894007588 : -899497514;
        }

        /*
             * Take a string and return the hex representation of its SHA-1.
             */
        function calcSHA1(str) {
            return calcSHA1Blks(str2blks_SHA1(str));
        }

        function calcSHA1Hex(str) {
            return calcSHA1Blks(hex2blks_SHA1(str));
        }

        function calcSHA1BA(ba) {
            return calcSHA1Blks(ba2blks_SHA1(ba, 0, ba.length));
        }

        function calcSHA1BAEx(ba, off, len) {
            return calcSHA1Blks(ba2blks_SHA1(ba, off, len));
        }

        function calcSHA1Blks(x) {
            var s = calcSHA1Raw(x);
            return hex(s[0]) + hex(s[1]) + hex(s[2]) + hex(s[3]) + hex(s[4]);
        }

        function calcSHA1Raw(x) {
            var w = new Array(80);

            var a = 1732584193;
            var b = -271733879;
            var c = -1732584194;
            var d = 271733878;
            var e = -1009589776;

            for (var i = 0; i < x.length; i += 16) {
                var olda = a;
                var oldb = b;
                var oldc = c;
                var oldd = d;
                var olde = e;

                for (var j = 0; j < 80; j++) {
                    var t;
                    if (j < 16) w[j] = x[i + j];
                    else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
                    t = add(add(rol(a, 5), ft(j, b, c, d)), add(add(e, w[j]), kt(j)));
                    e = d;
                    d = c;
                    c = rol(b, 30);
                    b = a;
                    a = t;
                }

                a = add(a, olda);
                b = add(b, oldb);
                c = add(c, oldc);
                d = add(d, oldd);
                e = add(e, olde);
            }
            return new Array(a, b, c, d, e);
        }

        function core_sha1(x, len) {
            x[len >> 5] |= 0x80 << (24 - len % 32);
            x[((len + 64 >> 9) << 4) + 15] = len;
            return calcSHA1Raw(x);
        }

        return {
            calcSHA1: calcSHA1,
            calcSHA1Hex: calcSHA1Hex,
            calcSHA1BA: calcSHA1BA,
            calcSHA1BAEx: calcSHA1BAEx
        }
    }

    return sha1();
});


;(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('sjcl', [], factory);
    } else {
        window.sjcl = factory();
    }
})(function () {

    // SJCL configured with:
    // --without-all --with-sha256 --with-aes --with-random --with-bitArray --with-codecHex --with-codecBase64 --compress=none

    /** @fileOverview Javascript cryptography implementation.
     *
     * Crush to remove comments, shorten variable names and
     * generally reduce transmission size.
     *
     * @author Emily Stark
     * @author Mike Hamburg
     * @author Dan Boneh
     */

    "use strict";
    /*jslint indent: 2, bitwise: false, nomen: false, plusplus: false, white: false, regexp: false */
    /*global document, window, escape, unescape, module, require, Uint32Array */

    /** @namespace The Stanford Javascript Crypto Library, top-level namespace. */
    var sjcl = {
        /** @namespace Symmetric ciphers. */
        cipher: {},

        /** @namespace Hash functions.  Right now only SHA256 is implemented. */
        hash: {},

        /** @namespace Key exchange functions.  Right now only SRP is implemented. */
        keyexchange: {},

        /** @namespace Block cipher modes of operation. */
        mode: {},

        /** @namespace Miscellaneous.  HMAC and PBKDF2. */
        misc: {},

        /**
         * @namespace Bit array encoders and decoders.
         *
         * @description
         * The members of this namespace are functions which translate between
         * SJCL's bitArrays and other objects (usually strings).  Because it
         * isn't always clear which direction is encoding and which is decoding,
         * the method names are "fromBits" and "toBits".
         */
        codec: {},

        /** @namespace Exceptions. */
        exception: {
            /** @constructor Ciphertext is corrupt. */
            corrupt: function (message) {
                this.toString = function () { return "CORRUPT: " + this.message; };
                this.message = message;
            },

            /** @constructor Invalid parameter. */
            invalid: function (message) {
                this.toString = function () { return "INVALID: " + this.message; };
                this.message = message;
            },

            /** @constructor Bug or missing feature in SJCL. @constructor */
            bug: function (message) {
                this.toString = function () { return "BUG: " + this.message; };
                this.message = message;
            },

            /** @constructor Something isn't ready. */
            notReady: function (message) {
                this.toString = function () { return "NOT READY: " + this.message; };
                this.message = message;
            }
        }
    };

    /** @fileOverview Arrays of bits, encoded as arrays of Numbers.
  *
  * @author Emily Stark
  * @author Mike Hamburg
  * @author Dan Boneh
  */

    /** @namespace Arrays of bits, encoded as arrays of Numbers.
     *
     * @description
     * <p>
     * These objects are the currency accepted by SJCL's crypto functions.
     * </p>
     *
     * <p>
     * Most of our crypto primitives operate on arrays of 4-byte words internally,
     * but many of them can take arguments that are not a multiple of 4 bytes.
     * This library encodes arrays of bits (whose size need not be a multiple of 8
     * bits) as arrays of 32-bit words.  The bits are packed, big-endian, into an
     * array of words, 32 bits at a time.  Since the words are double-precision
     * floating point numbers, they fit some extra data.  We use this (in a private,
     * possibly-changing manner) to encode the number of bits actually  present
     * in the last word of the array.
     * </p>
     *
     * <p>
     * Because bitwise ops clear this out-of-band data, these arrays can be passed
     * to ciphers like AES which want arrays of words.
     * </p>
     */
    sjcl.bitArray = {
        /**
         * Array slices in units of bits.
         * @param {bitArray} a The array to slice.
         * @param {Number} bstart The offset to the start of the slice, in bits.
         * @param {Number} bend The offset to the end of the slice, in bits.  If this is undefined,
         * slice until the end of the array.
         * @return {bitArray} The requested slice.
         */
        bitSlice: function (a, bstart, bend) {
            a = sjcl.bitArray._shiftRight(a.slice(bstart / 32), 32 - (bstart & 31)).slice(1);
            return (bend === undefined) ? a : sjcl.bitArray.clamp(a, bend - bstart);
        },

        /**
         * Extract a number packed into a bit array.
         * @param {bitArray} a The array to slice.
         * @param {Number} bstart The offset to the start of the slice, in bits.
         * @param {Number} length The length of the number to extract.
         * @return {Number} The requested slice.
         */
        extract: function (a, bstart, blength) {
            // FIXME: this Math.floor is not necessary at all, but for some reason
            // seems to suppress a bug in the Chromium JIT.
            var x, sh = Math.floor((-bstart - blength) & 31);
            if ((bstart + blength - 1 ^ bstart) & -32) {
                // it crosses a boundary
                x = (a[bstart / 32 | 0] << (32 - sh)) ^ (a[bstart / 32 + 1 | 0] >>> sh);
            } else {
                // within a single word
                x = a[bstart / 32 | 0] >>> sh;
            }
            return x & ((1 << blength) - 1);
        },

        /**
         * Concatenate two bit arrays.
         * @param {bitArray} a1 The first array.
         * @param {bitArray} a2 The second array.
         * @return {bitArray} The concatenation of a1 and a2.
         */
        concat: function (a1, a2) {
            if (a1.length === 0 || a2.length === 0) {
                return a1.concat(a2);
            }

            var last = a1[a1.length - 1], shift = sjcl.bitArray.getPartial(last);
            if (shift === 32) {
                return a1.concat(a2);
            } else {
                return sjcl.bitArray._shiftRight(a2, shift, last | 0, a1.slice(0, a1.length - 1));
            }
        },

        /**
         * Find the length of an array of bits.
         * @param {bitArray} a The array.
         * @return {Number} The length of a, in bits.
         */
        bitLength: function (a) {
            var l = a.length, x;
            if (l === 0) { return 0; }
            x = a[l - 1];
            return (l - 1) * 32 + sjcl.bitArray.getPartial(x);
        },

        /**
         * Truncate an array.
         * @param {bitArray} a The array.
         * @param {Number} len The length to truncate to, in bits.
         * @return {bitArray} A new array, truncated to len bits.
         */
        clamp: function (a, len) {
            if (a.length * 32 < len) { return a; }
            a = a.slice(0, Math.ceil(len / 32));
            var l = a.length;
            len = len & 31;
            if (l > 0 && len) {
                a[l - 1] = sjcl.bitArray.partial(len, a[l - 1] & 0x80000000 >> (len - 1), 1);
            }
            return a;
        },

        /**
         * Make a partial word for a bit array.
         * @param {Number} len The number of bits in the word.
         * @param {Number} x The bits.
         * @param {Number} [0] _end Pass 1 if x has already been shifted to the high side.
         * @return {Number} The partial word.
         */
        partial: function (len, x, _end) {
            if (len === 32) { return x; }
            return (_end ? x | 0 : x << (32 - len)) + len * 0x10000000000;
        },

        /**
         * Get the number of bits used by a partial word.
         * @param {Number} x The partial word.
         * @return {Number} The number of bits used by the partial word.
         */
        getPartial: function (x) {
            return Math.round(x / 0x10000000000) || 32;
        },

        /**
         * Compare two arrays for equality in a predictable amount of time.
         * @param {bitArray} a The first array.
         * @param {bitArray} b The second array.
         * @return {boolean} true if a == b; false otherwise.
         */
        equal: function (a, b) {
            if (sjcl.bitArray.bitLength(a) !== sjcl.bitArray.bitLength(b)) {
                return false;
            }
            var x = 0, i;
            for (i = 0; i < a.length; i++) {
                x |= a[i] ^ b[i];
            }
            return (x === 0);
        },

        /** Shift an array right.
         * @param {bitArray} a The array to shift.
         * @param {Number} shift The number of bits to shift.
         * @param {Number} [carry=0] A byte to carry in
         * @param {bitArray} [out=[]] An array to prepend to the output.
         * @private
         */
        _shiftRight: function (a, shift, carry, out) {
            var i, last2 = 0, shift2;
            if (out === undefined) { out = []; }

            for (; shift >= 32; shift -= 32) {
                out.push(carry);
                carry = 0;
            }
            if (shift === 0) {
                return out.concat(a);
            }

            for (i = 0; i < a.length; i++) {
                out.push(carry | a[i] >>> shift);
                carry = a[i] << (32 - shift);
            }
            last2 = a.length ? a[a.length - 1] : 0;
            shift2 = sjcl.bitArray.getPartial(last2);
            out.push(sjcl.bitArray.partial(shift + shift2 & 31, (shift + shift2 > 32) ? carry : out.pop(), 1));
            return out;
        },

        /** xor a block of 4 words together.
         * @private
         */
        _xor4: function (x, y) {
            return [x[0] ^ y[0], x[1] ^ y[1], x[2] ^ y[2], x[3] ^ y[3]];
        },

        /** byteswap a word array inplace.
         * (does not handle partial words)
         * @param {sjcl.bitArray} a word array
         * @return {sjcl.bitArray} byteswapped array
         */
        byteswapM: function (a) {
            var i, v, m = 0xff00;
            for (i = 0; i < a.length; ++i) {
                v = a[i];
                a[i] = (v >>> 24) | ((v >>> 8) & m) | ((v & m) << 8) | (v << 24);
            }
            return a;
        }
    };

    /** @fileOverview Javascript SHA-256 implementation.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * Special thanks to Aldo Cortesi for pointing out several bugs in
 * this code.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

    /**
     * Context for a SHA-256 operation in progress.
     * @constructor
     * @class Secure Hash Algorithm, 256 bits.
     */
    sjcl.hash.sha256 = function (hash) {
        if (!this._key[0]) { this._precompute(); }
        if (hash) {
            this._h = hash._h.slice(0);
            this._buffer = hash._buffer.slice(0);
            this._length = hash._length;
        } else {
            this.reset();
        }
    };

    /**
     * Hash a string or an array of words.
     * @static
     * @param {bitArray|String} data the data to hash.
     * @return {bitArray} The hash value, an array of 16 big-endian words.
     */
    sjcl.hash.sha256.hash = function (data) {
        return (new sjcl.hash.sha256()).update(data).finalize();
    };

    sjcl.hash.sha256.prototype = {
        /**
         * The hash's block size, in bits.
         * @constant
         */
        blockSize: 512,

        /**
         * Reset the hash state.
         * @return this
         */
        reset: function () {
            this._h = this._init.slice(0);
            this._buffer = [];
            this._length = 0;
            return this;
        },

        /**
         * Input several words to the hash.
         * @param {bitArray|String} data the data to hash.
         * @return this
         */
        update: function (data) {
            if (typeof data === "string") {
                data = sjcl.codec.utf8String.toBits(data);
            }
            var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data),
                ol = this._length,
                nl = this._length = ol + sjcl.bitArray.bitLength(data);
            for (i = 512 + ol & -512; i <= nl; i += 512) {
                this._block(b.splice(0, 16));
            }
            return this;
        },

        /**
         * Complete hashing and output the hash value.
         * @return {bitArray} The hash value, an array of 8 big-endian words.
         */
        finalize: function () {
            var i, b = this._buffer, h = this._h;

            // Round out and push the buffer
            b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1, 1)]);

            // Round out the buffer to a multiple of 16 words, less the 2 length words.
            for (i = b.length + 2; i & 15; i++) {
                b.push(0);
            }

            // append the length
            b.push(Math.floor(this._length / 0x100000000));
            b.push(this._length | 0);

            while (b.length) {
                this._block(b.splice(0, 16));
            }

            this.reset();
            return h;
        },

        /**
         * The SHA-256 initialization vector, to be precomputed.
         * @private
         */
        _init: [],
        /*
        _init:[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],
        */

        /**
         * The SHA-256 hash key, to be precomputed.
         * @private
         */
        _key: [],
        /*
        _key:
          [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
           0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
           0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
           0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
           0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
           0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
           0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
           0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2],
        */


        /**
         * Function to precompute _init and _key.
         * @private
         */
        _precompute: function () {
            var i = 0, prime = 2, factor;

            function frac(x) { return (x - Math.floor(x)) * 0x100000000 | 0; }

            outer: for (; i < 64; prime++) {
                for (factor = 2; factor * factor <= prime; factor++) {
                    if (prime % factor === 0) {
                        // not a prime
                        continue outer;
                    }
                }

                if (i < 8) {
                    this._init[i] = frac(Math.pow(prime, 1 / 2));
                }
                this._key[i] = frac(Math.pow(prime, 1 / 3));
                i++;
            }
        },

        /**
         * Perform one cycle of SHA-256.
         * @param {bitArray} words one block of words.
         * @private
         */
        _block: function (words) {
            var i, tmp, a, b,
              w = words.slice(0),
              h = this._h,
              k = this._key,
              h0 = h[0], h1 = h[1], h2 = h[2], h3 = h[3],
              h4 = h[4], h5 = h[5], h6 = h[6], h7 = h[7];

            /* Rationale for placement of |0 :
             * If a value can overflow is original 32 bits by a factor of more than a few
             * million (2^23 ish), there is a possibility that it might overflow the
             * 53-bit mantissa and lose precision.
             *
             * To avoid this, we clamp back to 32 bits by |'ing with 0 on any value that
             * propagates around the loop, and on the hash state h[].  I don't believe
             * that the clamps on h4 and on h0 are strictly necessary, but it's close
             * (for h4 anyway), and better safe than sorry.
             *
             * The clamps on h[] are necessary for the output to be correct even in the
             * common case and for short inputs.
             */
            for (i = 0; i < 64; i++) {
                // load up the input word for this round
                if (i < 16) {
                    tmp = w[i];
                } else {
                    a = w[(i + 1) & 15];
                    b = w[(i + 14) & 15];
                    tmp = w[i & 15] = ((a >>> 7 ^ a >>> 18 ^ a >>> 3 ^ a << 25 ^ a << 14) +
                                     (b >>> 17 ^ b >>> 19 ^ b >>> 10 ^ b << 15 ^ b << 13) +
                                     w[i & 15] + w[(i + 9) & 15]) | 0;
                }

                tmp = (tmp + h7 + (h4 >>> 6 ^ h4 >>> 11 ^ h4 >>> 25 ^ h4 << 26 ^ h4 << 21 ^ h4 << 7) + (h6 ^ h4 & (h5 ^ h6)) + k[i]); // | 0;

                // shift register
                h7 = h6; h6 = h5; h5 = h4;
                h4 = h3 + tmp | 0;
                h3 = h2; h2 = h1; h1 = h0;

                h0 = (tmp + ((h1 & h2) ^ (h3 & (h1 ^ h2))) + (h1 >>> 2 ^ h1 >>> 13 ^ h1 >>> 22 ^ h1 << 30 ^ h1 << 19 ^ h1 << 10)) | 0;
            }

            h[0] = h[0] + h0 | 0;
            h[1] = h[1] + h1 | 0;
            h[2] = h[2] + h2 | 0;
            h[3] = h[3] + h3 | 0;
            h[4] = h[4] + h4 | 0;
            h[5] = h[5] + h5 | 0;
            h[6] = h[6] + h6 | 0;
            h[7] = h[7] + h7 | 0;
        }
    };

    /** @fileOverview Low-level AES implementation.
 *
 * This file contains a low-level implementation of AES, optimized for
 * size and for efficiency on several browsers.  It is based on
 * OpenSSL's aes_core.c, a public-domain implementation by Vincent
 * Rijmen, Antoon Bosselaers and Paulo Barreto.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

    /**
     * Schedule out an AES key for both encryption and decryption.  This
     * is a low-level class.  Use a cipher mode to do bulk encryption.
     *
     * @constructor
     * @param {Array} key The key as an array of 4, 6 or 8 words.
     *
     * @class Advanced Encryption Standard (low-level interface)
     */
    sjcl.cipher.aes = function (key) {
        if (!this._tables[0][0][0]) {
            this._precompute();
        }

        var i, j, tmp,
          encKey, decKey,
          sbox = this._tables[0][4], decTable = this._tables[1],
          keyLen = key.length, rcon = 1;

        if (keyLen !== 4 && keyLen !== 6 && keyLen !== 8) {
            throw new sjcl.exception.invalid("invalid aes key size");
        }

        this._key = [encKey = key.slice(0), decKey = []];

        // schedule encryption keys
        for (i = keyLen; i < 4 * keyLen + 28; i++) {
            tmp = encKey[i - 1];

            // apply sbox
            if (i % keyLen === 0 || (keyLen === 8 && i % keyLen === 4)) {
                tmp = sbox[tmp >>> 24] << 24 ^ sbox[tmp >> 16 & 255] << 16 ^ sbox[tmp >> 8 & 255] << 8 ^ sbox[tmp & 255];

                // shift rows and add rcon
                if (i % keyLen === 0) {
                    tmp = tmp << 8 ^ tmp >>> 24 ^ rcon << 24;
                    rcon = rcon << 1 ^ (rcon >> 7) * 283;
                }
            }

            encKey[i] = encKey[i - keyLen] ^ tmp;
        }

        // schedule decryption keys
        for (j = 0; i; j++, i--) {
            tmp = encKey[j & 3 ? i : i - 4];
            if (i <= 4 || j < 4) {
                decKey[j] = tmp;
            } else {
                decKey[j] = decTable[0][sbox[tmp >>> 24]] ^
                            decTable[1][sbox[tmp >> 16 & 255]] ^
                            decTable[2][sbox[tmp >> 8 & 255]] ^
                            decTable[3][sbox[tmp & 255]];
            }
        }
    };

    sjcl.cipher.aes.prototype = {
        // public
        /* Something like this might appear here eventually
        name: "AES",
        blockSize: 4,
        keySizes: [4,6,8],
        */

        /**
         * Encrypt an array of 4 big-endian words.
         * @param {Array} data The plaintext.
         * @return {Array} The ciphertext.
         */
        encrypt: function (data) { return this._crypt(data, 0); },

        /**
         * Decrypt an array of 4 big-endian words.
         * @param {Array} data The ciphertext.
         * @return {Array} The plaintext.
         */
        decrypt: function (data) { return this._crypt(data, 1); },

        /**
         * The expanded S-box and inverse S-box tables.  These will be computed
         * on the client so that we don't have to send them down the wire.
         *
         * There are two tables, _tables[0] is for encryption and
         * _tables[1] is for decryption.
         *
         * The first 4 sub-tables are the expanded S-box with MixColumns.  The
         * last (_tables[01][4]) is the S-box itself.
         *
         * @private
         */
        _tables: [[[], [], [], [], []], [[], [], [], [], []]],

        /**
         * Expand the S-box tables.
         *
         * @private
         */
        _precompute: function () {
            var encTable = this._tables[0], decTable = this._tables[1],
                sbox = encTable[4], sboxInv = decTable[4],
                i, x, xInv, d = [], th = [], x2, x4, x8, s, tEnc, tDec;

            // Compute double and third tables
            for (i = 0; i < 256; i++) {
                th[(d[i] = i << 1 ^ (i >> 7) * 283) ^ i] = i;
            }

            for (x = xInv = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
                // Compute sbox
                s = xInv ^ xInv << 1 ^ xInv << 2 ^ xInv << 3 ^ xInv << 4;
                s = s >> 8 ^ s & 255 ^ 99;
                sbox[x] = s;
                sboxInv[s] = x;

                // Compute MixColumns
                x8 = d[x4 = d[x2 = d[x]]];
                tDec = x8 * 0x1010101 ^ x4 * 0x10001 ^ x2 * 0x101 ^ x * 0x1010100;
                tEnc = d[s] * 0x101 ^ s * 0x1010100;

                for (i = 0; i < 4; i++) {
                    encTable[i][x] = tEnc = tEnc << 24 ^ tEnc >>> 8;
                    decTable[i][s] = tDec = tDec << 24 ^ tDec >>> 8;
                }
            }

            // Compactify.  Considerable speedup on Firefox.
            for (i = 0; i < 5; i++) {
                encTable[i] = encTable[i].slice(0);
                decTable[i] = decTable[i].slice(0);
            }
        },

        /**
         * Encryption and decryption core.
         * @param {Array} input Four words to be encrypted or decrypted.
         * @param dir The direction, 0 for encrypt and 1 for decrypt.
         * @return {Array} The four encrypted or decrypted words.
         * @private
         */
        _crypt: function (input, dir) {
            if (input.length !== 4) {
                throw new sjcl.exception.invalid("invalid aes block size");
            }

            var key = this._key[dir],
                // state variables a,b,c,d are loaded with pre-whitened data
                a = input[0] ^ key[0],
                b = input[dir ? 3 : 1] ^ key[1],
                c = input[2] ^ key[2],
                d = input[dir ? 1 : 3] ^ key[3],
                a2, b2, c2,

                nInnerRounds = key.length / 4 - 2,
                i,
                kIndex = 4,
                out = [0, 0, 0, 0],
                table = this._tables[dir],

                // load up the tables
                t0 = table[0],
                t1 = table[1],
                t2 = table[2],
                t3 = table[3],
                sbox = table[4];

            // Inner rounds.  Cribbed from OpenSSL.
            for (i = 0; i < nInnerRounds; i++) {
                a2 = t0[a >>> 24] ^ t1[b >> 16 & 255] ^ t2[c >> 8 & 255] ^ t3[d & 255] ^ key[kIndex];
                b2 = t0[b >>> 24] ^ t1[c >> 16 & 255] ^ t2[d >> 8 & 255] ^ t3[a & 255] ^ key[kIndex + 1];
                c2 = t0[c >>> 24] ^ t1[d >> 16 & 255] ^ t2[a >> 8 & 255] ^ t3[b & 255] ^ key[kIndex + 2];
                d = t0[d >>> 24] ^ t1[a >> 16 & 255] ^ t2[b >> 8 & 255] ^ t3[c & 255] ^ key[kIndex + 3];
                kIndex += 4;
                a = a2; b = b2; c = c2;
            }

            // Last round.
            for (i = 0; i < 4; i++) {
                out[dir ? 3 & -i : i] =
                  sbox[a >>> 24] << 24 ^
                  sbox[b >> 16 & 255] << 16 ^
                  sbox[c >> 8 & 255] << 8 ^
                  sbox[d & 255] ^
                  key[kIndex++];
                a2 = a; a = b; b = c; c = d; d = a2;
            }

            return out;
        }
    };
    

    /** @fileOverview Random number generator.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 * @author Michael Brooks
 */

    /** @constructor
     * @class Random number generator
     * @description
     * <b>Use sjcl.random as a singleton for this class!</b>
     * <p>
     * This random number generator is a derivative of Ferguson and Schneier's
     * generator Fortuna.  It collects entropy from various events into several
     * pools, implemented by streaming SHA-256 instances.  It differs from
     * ordinary Fortuna in a few ways, though.
     * </p>
     *
     * <p>
     * Most importantly, it has an entropy estimator.  This is present because
     * there is a strong conflict here between making the generator available
     * as soon as possible, and making sure that it doesn't "run on empty".
     * In Fortuna, there is a saved state file, and the system is likely to have
     * time to warm up.
     * </p>
     *
     * <p>
     * Second, because users are unlikely to stay on the page for very long,
     * and to speed startup time, the number of pools increases logarithmically:
     * a new pool is created when the previous one is actually used for a reseed.
     * This gives the same asymptotic guarantees as Fortuna, but gives more
     * entropy to early reseeds.
     * </p>
     *
     * <p>
     * The entire mechanism here feels pretty klunky.  Furthermore, there are
     * several improvements that should be made, including support for
     * dedicated cryptographic functions that may be present in some browsers;
     * state files in local storage; cookies containing randomness; etc.  So
     * look for improvements in future versions.
     * </p>
     */
    sjcl.prng = function (defaultParanoia) {

        /* private */
        this._pools = [new sjcl.hash.sha256()];
        this._poolEntropy = [0];
        this._reseedCount = 0;
        this._robins = {};
        this._eventId = 0;

        this._collectorIds = {};
        this._collectorIdNext = 0;

        this._strength = 0;
        this._poolStrength = 0;
        this._nextReseed = 0;
        this._key = [0, 0, 0, 0, 0, 0, 0, 0];
        this._counter = [0, 0, 0, 0];
        this._cipher = undefined;
        this._defaultParanoia = defaultParanoia;

        /* event listener stuff */
        this._collectorsStarted = false;
        this._callbacks = { progress: {}, seeded: {} };
        this._callbackI = 0;

        /* constants */
        this._NOT_READY = 0;
        this._READY = 1;
        this._REQUIRES_RESEED = 2;

        this._MAX_WORDS_PER_BURST = 65536;
        this._PARANOIA_LEVELS = [0, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024];
        this._MILLISECONDS_PER_RESEED = 30000;
        this._BITS_PER_RESEED = 80;
    };

    sjcl.prng.prototype = {
        /** Generate several random words, and return them in an array.
         * A word consists of 32 bits (4 bytes)
         * @param {Number} nwords The number of words to generate.
         */
        randomWords: function (nwords, paranoia) {
            var out = [], i, readiness = this.isReady(paranoia), g;

            if (readiness === this._NOT_READY) {
                throw new sjcl.exception.notReady("generator isn't seeded");
            } else if (readiness & this._REQUIRES_RESEED) {
                this._reseedFromPools(!(readiness & this._READY));
            }

            for (i = 0; i < nwords; i += 4) {
                if ((i + 1) % this._MAX_WORDS_PER_BURST === 0) {
                    this._gate();
                }

                g = this._gen4words();
                out.push(g[0], g[1], g[2], g[3]);
            }
            this._gate();

            return out.slice(0, nwords);
        },

        setDefaultParanoia: function (paranoia, allowZeroParanoia) {
            if (paranoia === 0 && allowZeroParanoia !== "Setting paranoia=0 will ruin your security; use it only for testing") {
                throw "Setting paranoia=0 will ruin your security; use it only for testing";
            }

            this._defaultParanoia = paranoia;
        },

        /**
         * Add entropy to the pools.
         * @param data The entropic value.  Should be a 32-bit integer, array of 32-bit integers, or string
         * @param {Number} estimatedEntropy The estimated entropy of data, in bits
         * @param {String} source The source of the entropy, eg "mouse"
         */
        addEntropy: function (data, estimatedEntropy, source) {
            source = source || "user";

            var id,
              i, tmp,
              t = (new Date()).valueOf(),
              robin = this._robins[source],
              oldReady = this.isReady(), err = 0, objName;

            id = this._collectorIds[source];
            if (id === undefined) { id = this._collectorIds[source] = this._collectorIdNext++; }

            if (robin === undefined) { robin = this._robins[source] = 0; }
            this._robins[source] = (this._robins[source] + 1) % this._pools.length;

            switch (typeof (data)) {

                case "number":
                    if (estimatedEntropy === undefined) {
                        estimatedEntropy = 1;
                    }
                    this._pools[robin].update([id, this._eventId++, 1, estimatedEntropy, t, 1, data | 0]);
                    break;

                case "object":
                    objName = Object.prototype.toString.call(data);
                    if (objName === "[object Uint32Array]") {
                        tmp = [];
                        for (i = 0; i < data.length; i++) {
                            tmp.push(data[i]);
                        }
                        data = tmp;
                    } else {
                        if (objName !== "[object Array]") {
                            err = 1;
                        }
                        for (i = 0; i < data.length && !err; i++) {
                            if (typeof (data[i]) !== "number") {
                                err = 1;
                            }
                        }
                    }
                    if (!err) {
                        if (estimatedEntropy === undefined) {
                            /* horrible entropy estimator */
                            estimatedEntropy = 0;
                            for (i = 0; i < data.length; i++) {
                                tmp = data[i];
                                while (tmp > 0) {
                                    estimatedEntropy++;
                                    tmp = tmp >>> 1;
                                }
                            }
                        }
                        this._pools[robin].update([id, this._eventId++, 2, estimatedEntropy, t, data.length].concat(data));
                    }
                    break;

                case "string":
                    if (estimatedEntropy === undefined) {
                        /* English text has just over 1 bit per character of entropy.
                         * But this might be HTML or something, and have far less
                         * entropy than English...  Oh well, let's just say one bit.
                         */
                        estimatedEntropy = data.length;
                    }
                    this._pools[robin].update([id, this._eventId++, 3, estimatedEntropy, t, data.length]);
                    this._pools[robin].update(data);
                    break;

                default:
                    err = 1;
            }
            if (err) {
                throw new sjcl.exception.bug("random: addEntropy only supports number, array of numbers or string");
            }

            /* record the new strength */
            this._poolEntropy[robin] += estimatedEntropy;
            this._poolStrength += estimatedEntropy;

            /* fire off events */
            if (oldReady === this._NOT_READY) {
                if (this.isReady() !== this._NOT_READY) {
                    this._fireEvent("seeded", Math.max(this._strength, this._poolStrength));
                }
                this._fireEvent("progress", this.getProgress());
            }
        },

        /** Is the generator ready? */
        isReady: function (paranoia) {
            var entropyRequired = this._PARANOIA_LEVELS[(paranoia !== undefined) ? paranoia : this._defaultParanoia];

            if (this._strength && this._strength >= entropyRequired) {
                return (this._poolEntropy[0] > this._BITS_PER_RESEED && (new Date()).valueOf() > this._nextReseed) ?
                  this._REQUIRES_RESEED | this._READY :
                  this._READY;
            } else {
                return (this._poolStrength >= entropyRequired) ?
                  this._REQUIRES_RESEED | this._NOT_READY :
                  this._NOT_READY;
            }
        },

        /** Get the generator's progress toward readiness, as a fraction */
        getProgress: function (paranoia) {
            var entropyRequired = this._PARANOIA_LEVELS[paranoia ? paranoia : this._defaultParanoia];

            if (this._strength >= entropyRequired) {
                return 1.0;
            } else {
                return (this._poolStrength > entropyRequired) ?
                  1.0 :
                  this._poolStrength / entropyRequired;
            }
        },

        /** start the built-in entropy collectors */
        startCollectors: function () {
            if (this._collectorsStarted) { return; }

            this._eventListener = {
                loadTimeCollector: this._bind(this._loadTimeCollector),
                mouseCollector: this._bind(this._mouseCollector),
                keyboardCollector: this._bind(this._keyboardCollector),
                accelerometerCollector: this._bind(this._accelerometerCollector),
                touchCollector: this._bind(this._touchCollector)
            };

            if (window.addEventListener) {
                window.addEventListener("load", this._eventListener.loadTimeCollector, false);
                window.addEventListener("keypress", this._eventListener.keyboardCollector, false);
            } else if (document.attachEvent) {
                document.attachEvent("onload", this._eventListener.loadTimeCollector);
                document.attachEvent("keypress", this._eventListener.keyboardCollector);
            } else {
                throw new sjcl.exception.bug("can't attach event");
            }

            this._collectorsStarted = true;
        },

        /** stop the built-in entropy collectors */
        stopCollectors: function () {
            if (!this._collectorsStarted) { return; }

            if (window.removeEventListener) {
                window.removeEventListener("load", this._eventListener.loadTimeCollector, false);
                window.removeEventListener("keypress", this._eventListener.keyboardCollector, false);
            } else if (document.detachEvent) {
                document.detachEvent("onload", this._eventListener.loadTimeCollector);
                document.detachEvent("keypress", this._eventListener.keyboardCollector);
            }

            this._collectorsStarted = false;
        },

        /* use a cookie to store entropy.
        useCookie: function (all_cookies) {
            throw new sjcl.exception.bug("random: useCookie is unimplemented");
        },*/

        /** add an event listener for progress or seeded-ness. */
        addEventListener: function (name, callback) {
            this._callbacks[name][this._callbackI++] = callback;
        },

        /** remove an event listener for progress or seeded-ness */
        removeEventListener: function (name, cb) {
            var i, j, cbs = this._callbacks[name], jsTemp = [];

            /* I'm not sure if this is necessary; in C++, iterating over a
             * collection and modifying it at the same time is a no-no.
             */

            for (j in cbs) {
                if (cbs.hasOwnProperty(j) && cbs[j] === cb) {
                    jsTemp.push(j);
                }
            }

            for (i = 0; i < jsTemp.length; i++) {
                j = jsTemp[i];
                delete cbs[j];
            }
        },

        _bind: function (func) {
            var that = this;
            return function () {
                func.apply(that, arguments);
            };
        },

        /** Generate 4 random words, no reseed, no gate.
         * @private
         */
        _gen4words: function () {
            for (var i = 0; i < 4; i++) {
                this._counter[i] = this._counter[i] + 1 | 0;
                if (this._counter[i]) { break; }
            }
            return this._cipher.encrypt(this._counter);
        },

        /* Rekey the AES instance with itself after a request, or every _MAX_WORDS_PER_BURST words.
         * @private
         */
        _gate: function () {
            this._key = this._gen4words().concat(this._gen4words());
            this._cipher = new sjcl.cipher.aes(this._key);
        },

        /** Reseed the generator with the given words
         * @private
         */
        _reseed: function (seedWords) {
            this._key = sjcl.hash.sha256.hash(this._key.concat(seedWords));
            this._cipher = new sjcl.cipher.aes(this._key);
            for (var i = 0; i < 4; i++) {
                this._counter[i] = this._counter[i] + 1 | 0;
                if (this._counter[i]) { break; }
            }
        },

        /** reseed the data from the entropy pools
         * @param full If set, use all the entropy pools in the reseed.
         */
        _reseedFromPools: function (full) {
            var reseedData = [], strength = 0, i;

            this._nextReseed = reseedData[0] =
              (new Date()).valueOf() + this._MILLISECONDS_PER_RESEED;

            for (i = 0; i < 16; i++) {
                /* On some browsers, this is cryptographically random.  So we might
                 * as well toss it in the pot and stir...
                 */
                reseedData.push(Math.random() * 0x100000000 | 0);
            }

            for (i = 0; i < this._pools.length; i++) {
                reseedData = reseedData.concat(this._pools[i].finalize());
                strength += this._poolEntropy[i];
                this._poolEntropy[i] = 0;

                if (!full && (this._reseedCount & (1 << i))) { break; }
            }

            /* if we used the last pool, push a new one onto the stack */
            if (this._reseedCount >= 1 << this._pools.length) {
                this._pools.push(new sjcl.hash.sha256());
                this._poolEntropy.push(0);
            }

            /* how strong was this reseed? */
            this._poolStrength -= strength;
            if (strength > this._strength) {
                this._strength = strength;
            }

            this._reseedCount++;
            this._reseed(reseedData);
        },

        _keyboardCollector: function () {
            this._addCurrentTimeToEntropy(1);
        },

        _mouseCollector: function (ev) {
            var x, y;

            try {
                x = ev.x || ev.clientX || ev.offsetX || 0;
                y = ev.y || ev.clientY || ev.offsetY || 0;
            } catch (err) {
                // Event originated from a secure element. No mouse position available.
                x = 0;
                y = 0;
            }

            if (x != 0 && y != 0) {
                sjcl.random.addEntropy([x, y], 2, "mouse");
            }

            this._addCurrentTimeToEntropy(0);
        },

        _touchCollector: function (ev) {
            var touch = ev.touches[0] || ev.changedTouches[0];
            var x = touch.pageX || touch.clientX,
                y = touch.pageY || touch.clientY;

            sjcl.random.addEntropy([x, y], 1, "touch");

            this._addCurrentTimeToEntropy(0);
        },

        _loadTimeCollector: function () {
            this._addCurrentTimeToEntropy(2);
        },

        _addCurrentTimeToEntropy: function (estimatedEntropy) {
            if (typeof window !== 'undefined' && window.performance && typeof window.performance.now === "function") {
                //how much entropy do we want to add here?
                sjcl.random.addEntropy(window.performance.now(), estimatedEntropy, "loadtime");
            } else {
                sjcl.random.addEntropy((new Date()).valueOf(), estimatedEntropy, "loadtime");
            }
        },
        _accelerometerCollector: function (ev) {
            var ac = ev.accelerationIncludingGravity.x || ev.accelerationIncludingGravity.y || ev.accelerationIncludingGravity.z;
            if (window.orientation) {
                var or = window.orientation;
                if (typeof or === "number") {
                    sjcl.random.addEntropy(or, 1, "accelerometer");
                }
            }
            if (ac) {
                sjcl.random.addEntropy(ac, 2, "accelerometer");
            }
            this._addCurrentTimeToEntropy(0);
        },

        _fireEvent: function (name, arg) {
            var j, cbs = sjcl.random._callbacks[name], cbsTemp = [];
            /* TODO: there is a race condition between removing collectors and firing them */

            /* I'm not sure if this is necessary; in C++, iterating over a
             * collection and modifying it at the same time is a no-no.
             */

            for (j in cbs) {
                if (cbs.hasOwnProperty(j)) {
                    cbsTemp.push(cbs[j]);
                }
            }

            for (j = 0; j < cbsTemp.length; j++) {
                cbsTemp[j](arg);
            }
        }
    };

    /** an instance for the prng.
    * @see sjcl.prng
    */
    sjcl.random = new sjcl.prng(6);

    (function () {
        // function for getting nodejs crypto module. catches and ignores errors.
        function getCryptoModule() {
            try {
                return require('crypto');
            }
            catch (e) {
                return null;
            }
        }

        try {
            var buf, crypt, ab;

            // get cryptographically strong entropy depending on runtime environment
            if (typeof module !== 'undefined' && module.exports && (crypt = getCryptoModule()) && crypt.randomBytes) {
                buf = crypt.randomBytes(1024 / 8);
                buf = new Uint32Array(new Uint8Array(buf).buffer);
                sjcl.random.addEntropy(buf, 1024, "crypto.randomBytes");

            } else if (typeof window !== 'undefined' && typeof Uint32Array !== 'undefined') {
                ab = new Uint32Array(32);
                if (window.crypto && window.crypto.getRandomValues) {
                    window.crypto.getRandomValues(ab);
                } else if (window.msCrypto && window.msCrypto.getRandomValues) {
                    window.msCrypto.getRandomValues(ab);
                } else {
                    return;
                }

                // get cryptographically strong entropy in Webkit
                sjcl.random.addEntropy(ab, 1024, "crypto.getRandomValues");

            } else {
                // no getRandomValues :-(
            }
        } catch (e) {
            if (typeof window !== 'undefined' && window.console) {
                console.log("There was an error collecting entropy from the browser:");
                console.log(e);
                //we do not want the library to fail due to randomness not being maintained.
            }
        }
    }());

 

    /** @fileOverview Bit array codec implementations.
     *
     * @author Emily Stark
     * @author Mike Hamburg
     * @author Dan Boneh
     */

    /** @namespace Hexadecimal */
    sjcl.codec.hex = {
        /** Convert from a bitArray to a hex string. */
        fromBits: function (arr) {
            var out = "", i;
            for (i = 0; i < arr.length; i++) {
                out += ((arr[i] | 0) + 0xF00000000000).toString(16).substr(4);
            }
            return out.substr(0, sjcl.bitArray.bitLength(arr) / 4);//.replace(/(.{8})/g, "$1 ");
        },
        /** Convert from a hex string to a bitArray. */
        toBits: function (str) {
            var i, out = [], len;
            str = str.replace(/\s|0x/g, "");
            len = str.length;
            str = str + "00000000";
            for (i = 0; i < str.length; i += 8) {
                out.push(parseInt(str.substr(i, 8), 16) ^ 0);
            }
            return sjcl.bitArray.clamp(out, len * 4);
        }
    };

    /** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

    /**
     * UTF-8 strings
     * @namespace
     */
    sjcl.codec.utf8String = {
        /** Convert from a bitArray to a UTF-8 string. */
        fromBits: function (arr) {
            var out = "", bl = sjcl.bitArray.bitLength(arr), i, tmp;
            for (i = 0; i < bl / 8; i++) {
                if ((i & 3) === 0) {
                    tmp = arr[i / 4];
                }
                out += String.fromCharCode(tmp >>> 24);
                tmp <<= 8;
            }
            return decodeURIComponent(escape(out));
        },

        /** Convert from a UTF-8 string to a bitArray. */
        toBits: function (str) {
            str = unescape(encodeURIComponent(str));
            var out = [], i, tmp = 0;
            for (i = 0; i < str.length; i++) {
                tmp = tmp << 8 | str.charCodeAt(i);
                if ((i & 3) === 3) {
                    out.push(tmp);
                    tmp = 0;
                }
            }
            if (i & 3) {
                out.push(sjcl.bitArray.partial(8 * (i & 3), tmp));
            }
            return out;
        }
    };

    /** @fileOverview Bit array codec implementations.
     *
     * @author Emily Stark
     * @author Mike Hamburg
     * @author Dan Boneh
     */

    /**
     * Base64 encoding/decoding 
     * @namespace
     */
    sjcl.codec.base64 = {
        /** The base64 alphabet.
         * @private
         */
        _chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",

        /** Convert from a bitArray to a base64 string. */
        fromBits: function (arr, _noEquals, _url) {
            var out = "", i, bits = 0, c = sjcl.codec.base64._chars, ta = 0, bl = sjcl.bitArray.bitLength(arr);
            if (_url) {
                c = c.substr(0, 62) + '-_';
            }
            for (i = 0; out.length * 6 < bl;) {
                out += c.charAt((ta ^ arr[i] >>> bits) >>> 26);
                if (bits < 6) {
                    ta = arr[i] << (6 - bits);
                    bits += 26;
                    i++;
                } else {
                    ta <<= 6;
                    bits -= 6;
                }
            }
            while ((out.length & 3) && !_noEquals) { out += "="; }
            return out;
        },

        /** Convert from a base64 string to a bitArray */
        toBits: function (str, _url) {
            str = str.replace(/\s|=/g, '');
            var out = [], i, bits = 0, c = sjcl.codec.base64._chars, ta = 0, x;
            if (_url) {
                c = c.substr(0, 62) + '-_';
            }
            for (i = 0; i < str.length; i++) {
                x = c.indexOf(str.charAt(i));
                if (x < 0) {
                    throw new sjcl.exception.invalid("this isn't base64!");
                }
                if (bits > 26) {
                    bits -= 26;
                    out.push(ta ^ x >>> bits);
                    ta = x << (32 - bits);
                } else {
                    bits += 6;
                    ta ^= x << (32 - bits);
                }
            }
            if (bits & 56) {
                out.push(sjcl.bitArray.partial(bits & 56, ta, 1));
            }
            return out;
        }
    };

    sjcl.codec.base64url = {
        fromBits: function (arr) { return sjcl.codec.base64.fromBits(arr, 1, 1); },
        toBits: function (str) { return sjcl.codec.base64.toBits(str, 1); }
    };
    return sjcl;
});

;(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('BigInteger', [], factory);
    } else {
        window.BigInteger = factory();
    }
})(function() {

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Basic JavaScript BN library - subset useful for RSA encryption. 
 * Copyright (c) 2005  Tom Wu 
 * All Rights Reserved. 
 * See "LICENSE" for details.
 */

// Bits per digit
    ;
    var dbits;

// JavaScript engine analysis
    var canary = 0xdeadbeefcafe;
    var j_lm = ((canary & 0xffffff) == 0xefcafe);

// (public) Constructor
    function BigInteger(a, b, c) {
        if (a != null)
            if ("number" == typeof a) this.fromNumber(a, b, c);
            else if (b == null && "string" != typeof a) this.fromString(a, 256);
            else this.fromString(a, b);
    }

// return new, unset BigInteger
    function nbi() { return new BigInteger(null); }

// am: Compute w_j += (x*this_i), propagate carries,
// c is initial carry, returns final carry.
// c < 3*dvalue, x < 2*dvalue, this_i < dvalue
// We need to select the fastest one that works in this environment.

// am1: use a single mult and divide to get the high bits,
// max digit bits should be 26 because
// max internal value = 2*dvalue^2-2*dvalue (< 2^53)
    function am1(i, x, w, j, c, n) {
        while (--n >= 0) {
            var v = x * this[i++] + w[j] + c;
            c = Math.floor(v / 0x4000000);
            w[j++] = v & 0x3ffffff;
        }
        return c;
    }

// am2 avoids a big mult-and-extract completely.
// Max digit bits should be <= 30 because we do bitwise ops
// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
    function am2(i, x, w, j, c, n) {
        var xl = x & 0x7fff, xh = x >> 15;
        while (--n >= 0) {
            var l = this[i] & 0x7fff;
            var h = this[i++] >> 15;
            var m = xh * l + h * xl;
            l = xl * l + ((m & 0x7fff) << 15) + w[j] + (c & 0x3fffffff);
            c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
            w[j++] = l & 0x3fffffff;
        }
        return c;
    }

// Alternately, set max digit bits to 28 since some
// browsers slow down when dealing with 32-bit numbers.
    function am3(i, x, w, j, c, n) {
        var xl = x & 0x3fff, xh = x >> 14;
        while (--n >= 0) {
            var l = this[i] & 0x3fff;
            var h = this[i++] >> 14;
            var m = xh * l + h * xl;
            l = xl * l + ((m & 0x3fff) << 14) + w[j] + c;
            c = (l >> 28) + (m >> 14) + xh * h;
            w[j++] = l & 0xfffffff;
        }
        return c;
    }

    if (j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
        BigInteger.prototype.am = am2;
        dbits = 30;
    } else if (j_lm && (navigator.appName != "Netscape")) {
        BigInteger.prototype.am = am1;
        dbits = 26;
    } else { // Mozilla/Netscape seems to prefer am3
        BigInteger.prototype.am = am3;
        dbits = 28;
    }

    BigInteger.prototype.DB = dbits;
    BigInteger.prototype.DM = ((1 << dbits) - 1);
    BigInteger.prototype.DV = (1 << dbits);

    var BI_FP = 52;
    BigInteger.prototype.FV = Math.pow(2, BI_FP);
    BigInteger.prototype.F1 = BI_FP - dbits;
    BigInteger.prototype.F2 = 2 * dbits - BI_FP;

// Digit conversions
    var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
    var BI_RC = new Array();
    var rr, vv;
    rr = "0".charCodeAt(0);
    for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
    rr = "a".charCodeAt(0);
    for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
    rr = "A".charCodeAt(0);
    for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

    function int2char(n) { return BI_RM.charAt(n); }

    function intAt(s, i) {
        var c = BI_RC[s.charCodeAt(i)];
        return (c == null) ? -1 : c;
    }

// (protected) copy this to r
    function bnpCopyTo(r) {
        for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];
        r.t = this.t;
        r.s = this.s;
    }

// (protected) set from integer value x, -DV <= x < DV
    function bnpFromInt(x) {
        this.t = 1;
        this.s = (x < 0) ? -1 : 0;
        if (x > 0) this[0] = x;
        else if (x < -1) this[0] = x + DV;
        else this.t = 0;
    }

// return bigint initialized to value
    function nbv(i) {
        var r = nbi();
        r.fromInt(i);
        return r;
    }

// (protected) set from string and radix
    function bnpFromString(s, b) {
        var k;
        if (b == 16) k = 4;
        else if (b == 8) k = 3;
        else if (b == 256) k = 8; // byte array
        else if (b == 2) k = 1;
        else if (b == 32) k = 5;
        else if (b == 4) k = 2;
        else {
            this.fromRadix(s, b);
            return;
        }
        this.t = 0;
        this.s = 0;
        var i = s.length, mi = false, sh = 0;
        while (--i >= 0) {
            var x = (k == 8) ? s[i] & 0xff : intAt(s, i);
            if (x < 0) {
                if (s.charAt(i) == "-") mi = true;
                continue;
            }
            mi = false;
            if (sh == 0)
                this[this.t++] = x;
            else if (sh + k > this.DB) {
                this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;
                this[this.t++] = (x >> (this.DB - sh));
            } else
                this[this.t - 1] |= x << sh;
            sh += k;
            if (sh >= this.DB) sh -= this.DB;
        }
        if (k == 8 && (s[0] & 0x80) != 0) {
            this.s = -1;
            if (sh > 0) this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;
        }
        this.clamp();
        if (mi) BigInteger.ZERO.subTo(this, this);
    }

// (protected) clamp off excess high words
    function bnpClamp() {
        var c = this.s & this.DM;
        while (this.t > 0 && this[this.t - 1] == c)--this.t;
    }

// (public) return string representation in given radix
    function bnToString(b) {
        if (this.s < 0) return "-" + this.negate().toString(b);
        var k;
        if (b == 16) k = 4;
        else if (b == 8) k = 3;
        else if (b == 2) k = 1;
        else if (b == 32) k = 5;
        else if (b == 4) k = 2;
        else return this.toRadix(b);
        var km = (1 << k) - 1, d, m = false, r = "", i = this.t;
        var p = this.DB - (i * this.DB) % k;
        if (i-- > 0) {
            if (p < this.DB && (d = this[i] >> p) > 0) {
                m = true;
                r = int2char(d);
            }
            while (i >= 0) {
                if (p < k) {
                    d = (this[i] & ((1 << p) - 1)) << (k - p);
                    d |= this[--i] >> (p += this.DB - k);
                } else {
                    d = (this[i] >> (p -= k)) & km;
                    if (p <= 0) {
                        p += this.DB;
                        --i;
                    }
                }
                if (d > 0) m = true;
                if (m) r += int2char(d);
            }
        }
        return m ? r : "0";
    }

// (public) -this
    function bnNegate() {
        var r = nbi();
        BigInteger.ZERO.subTo(this, r);
        return r;
    }

// (public) |this|
    function bnAbs() { return (this.s < 0) ? this.negate() : this; }

// (public) return + if this > a, - if this < a, 0 if equal
    function bnCompareTo(a) {
        var r = this.s - a.s;
        if (r != 0) return r;
        var i = this.t;
        r = i - a.t;
        if (r != 0) return (this.s < 0) ? -r : r;
        while (--i >= 0) if ((r = this[i] - a[i]) != 0) return r;
        return 0;
    }

// returns bit length of the integer x
    function nbits(x) {
        var r = 1, t;
        if ((t = x >>> 16) != 0) {
            x = t;
            r += 16;
        }
        if ((t = x >> 8) != 0) {
            x = t;
            r += 8;
        }
        if ((t = x >> 4) != 0) {
            x = t;
            r += 4;
        }
        if ((t = x >> 2) != 0) {
            x = t;
            r += 2;
        }
        if ((t = x >> 1) != 0) {
            x = t;
            r += 1;
        }
        return r;
    }

// (public) return the number of bits in "this"
    function bnBitLength() {
        if (this.t <= 0) return 0;
        return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ (this.s & this.DM));
    }

// (protected) r = this << n*DB
    function bnpDLShiftTo(n, r) {
        var i;
        for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];
        for (i = n - 1; i >= 0; --i) r[i] = 0;
        r.t = this.t + n;
        r.s = this.s;
    }

// (protected) r = this >> n*DB
    function bnpDRShiftTo(n, r) {
        for (var i = n; i < this.t; ++i) r[i - n] = this[i];
        r.t = Math.max(this.t - n, 0);
        r.s = this.s;
    }

// (protected) r = this << n
    function bnpLShiftTo(n, r) {
        var bs = n % this.DB;
        var cbs = this.DB - bs;
        var bm = (1 << cbs) - 1;
        var ds = Math.floor(n / this.DB), c = (this.s << bs) & this.DM, i;
        for (i = this.t - 1; i >= 0; --i) {
            r[i + ds + 1] = (this[i] >> cbs) | c;
            c = (this[i] & bm) << bs;
        }
        for (i = ds - 1; i >= 0; --i) r[i] = 0;
        r[ds] = c;
        r.t = this.t + ds + 1;
        r.s = this.s;
        r.clamp();
    }

// (protected) r = this >> n
    function bnpRShiftTo(n, r) {
        r.s = this.s;
        var ds = Math.floor(n / this.DB);
        if (ds >= this.t) {
            r.t = 0;
            return;
        }
        var bs = n % this.DB;
        var cbs = this.DB - bs;
        var bm = (1 << bs) - 1;
        r[0] = this[ds] >> bs;
        for (var i = ds + 1; i < this.t; ++i) {
            r[i - ds - 1] |= (this[i] & bm) << cbs;
            r[i - ds] = this[i] >> bs;
        }
        if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
        r.t = this.t - ds;
        r.clamp();
    }

// (protected) r = this - a
    function bnpSubTo(a, r) {
        var i = 0, c = 0, m = Math.min(a.t, this.t);
        while (i < m) {
            c += this[i] - a[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
        }
        if (a.t < this.t) {
            c -= a.s;
            while (i < this.t) {
                c += this[i];
                r[i++] = c & this.DM;
                c >>= this.DB;
            }
            c += this.s;
        } else {
            c += this.s;
            while (i < a.t) {
                c -= a[i];
                r[i++] = c & this.DM;
                c >>= this.DB;
            }
            c -= a.s;
        }
        r.s = (c < 0) ? -1 : 0;
        if (c < -1) r[i++] = this.DV + c;
        else if (c > 0) r[i++] = c;
        r.t = i;
        r.clamp();
    }

// (protected) r = this * a, r != this,a (HAC 14.12)
// "this" should be the larger one if appropriate.
    function bnpMultiplyTo(a, r) {
        var x = this.abs(), y = a.abs();
        var i = x.t;
        r.t = i + y.t;
        while (--i >= 0) r[i] = 0;
        for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
        r.s = 0;
        r.clamp();
        if (this.s != a.s) BigInteger.ZERO.subTo(r, r);
    }

// (protected) r = this^2, r != this (HAC 14.16)
    function bnpSquareTo(r) {
        var x = this.abs();
        var i = r.t = 2 * x.t;
        while (--i >= 0) r[i] = 0;
        for (i = 0; i < x.t - 1; ++i) {
            var c = x.am(i, x[i], r, 2 * i, 0, 1);
            if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
                r[i + x.t] -= x.DV;
                r[i + x.t + 1] = 1;
            }
        }
        if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
        r.s = 0;
        r.clamp();
    }

// (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
// r != q, this != m.  q or r may be null.
    function bnpDivRemTo(m, q, r) {
        var pm = m.abs();
        if (pm.t <= 0) return;
        var pt = this.abs();
        if (pt.t < pm.t) {
            if (q != null) q.fromInt(0);
            if (r != null) this.copyTo(r);
            return;
        }
        if (r == null) r = nbi();
        var y = nbi(), ts = this.s, ms = m.s;
        var nsh = this.DB - nbits(pm[pm.t - 1]); // normalize modulus
        if (nsh > 0) {
            pm.lShiftTo(nsh, y);
            pt.lShiftTo(nsh, r);
        } else {
            pm.copyTo(y);
            pt.copyTo(r);
        }
        var ys = y.t;
        var y0 = y[ys - 1];
        if (y0 == 0) return;
        var yt = y0 * (1 << this.F1) + ((ys > 1) ? y[ys - 2] >> this.F2 : 0);
        var d1 = this.FV / yt, d2 = (1 << this.F1) / yt, e = 1 << this.F2;
        var i = r.t, j = i - ys, t = (q == null) ? nbi() : q;
        y.dlShiftTo(j, t);
        if (r.compareTo(t) >= 0) {
            r[r.t++] = 1;
            r.subTo(t, r);
        }
        BigInteger.ONE.dlShiftTo(ys, t);
        t.subTo(y, y); // "negative" y so we can replace sub with am later
        while (y.t < ys) y[y.t++] = 0;
        while (--j >= 0) {
            // Estimate quotient digit
            var qd = (r[--i] == y0) ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
            if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) { // Try it out
                y.dlShiftTo(j, t);
                r.subTo(t, r);
                while (r[i] < --qd) r.subTo(t, r);
            }
        }
        if (q != null) {
            r.drShiftTo(ys, q);
            if (ts != ms) BigInteger.ZERO.subTo(q, q);
        }
        r.t = ys;
        r.clamp();
        if (nsh > 0) r.rShiftTo(nsh, r); // Denormalize remainder
        if (ts < 0) BigInteger.ZERO.subTo(r, r);
    }

// (public) this mod a
    function bnMod(a) {
        var r = nbi();
        this.abs().divRemTo(a, null, r);
        if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
        return r;
    }

// Modular reduction using "classic" algorithm
    function Classic(m) { this.m = m; }

    function cConvert(x) {
        if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
        else return x;
    }

    function cRevert(x) { return x; }

    function cReduce(x) { x.divRemTo(this.m, null, x); }

    function cMulTo(x, y, r) {
        x.multiplyTo(y, r);
        this.reduce(r);
    }

    function cSqrTo(x, r) {
        x.squareTo(r);
        this.reduce(r);
    }

    Classic.prototype.convert = cConvert;
    Classic.prototype.revert = cRevert;
    Classic.prototype.reduce = cReduce;
    Classic.prototype.mulTo = cMulTo;
    Classic.prototype.sqrTo = cSqrTo;

// (protected) return "-1/this % 2^DB"; useful for Mont. reduction
// justification:
//         xy == 1 (mod m)
//         xy =  1+km
//   xy(2-xy) = (1+km)(1-km)
// x[y(2-xy)] = 1-k^2m^2
// x[y(2-xy)] == 1 (mod m^2)
// if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
// should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
// JS multiply "overflows" differently from C/C++, so care is needed here.
    function bnpInvDigit() {
        if (this.t < 1) return 0;
        var x = this[0];
        if ((x & 1) == 0) return 0;
        var y = x & 3; // y == 1/x mod 2^2
        y = (y * (2 - (x & 0xf) * y)) & 0xf; // y == 1/x mod 2^4
        y = (y * (2 - (x & 0xff) * y)) & 0xff; // y == 1/x mod 2^8
        y = (y * (2 - (((x & 0xffff) * y) & 0xffff))) & 0xffff; // y == 1/x mod 2^16
        // last step - calculate inverse mod DV directly;
        // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
        y = (y * (2 - x * y % this.DV)) % this.DV; // y == 1/x mod 2^dbits
        // we really want the negative inverse, and -DV < y < DV
        return (y > 0) ? this.DV - y : -y;
    }

// Montgomery reduction
    function Montgomery(m) {
        this.m = m;
        this.mp = m.invDigit();
        this.mpl = this.mp & 0x7fff;
        this.mph = this.mp >> 15;
        this.um = (1 << (m.DB - 15)) - 1;
        this.mt2 = 2 * m.t;
    }

// xR mod m
    function montConvert(x) {
        var r = nbi();
        x.abs().dlShiftTo(this.m.t, r);
        r.divRemTo(this.m, null, r);
        if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
        return r;
    }

// x/R mod m
    function montRevert(x) {
        var r = nbi();
        x.copyTo(r);
        this.reduce(r);
        return r;
    }

// x = x/R mod m (HAC 14.32)
    function montReduce(x) {
        while (x.t <= this.mt2) // pad x so am has enough room later
            x[x.t++] = 0;
        for (var i = 0; i < this.m.t; ++i) {
            // faster way of calculating u0 = x[i]*mp mod DV
            var j = x[i] & 0x7fff;
            var u0 = (j * this.mpl + (((j * this.mph + (x[i] >> 15) * this.mpl) & this.um) << 15)) & x.DM;
            // use am to combine the multiply-shift-add into one call
            j = i + this.m.t;
            x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
            // propagate carry
            while (x[j] >= x.DV) {
                x[j] -= x.DV;
                x[++j]++;
            }
        }
        x.clamp();
        x.drShiftTo(this.m.t, x);
        if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
    }

// r = "x^2/R mod m"; x != r
    function montSqrTo(x, r) {
        x.squareTo(r);
        this.reduce(r);
    }

// r = "xy/R mod m"; x,y != r
    function montMulTo(x, y, r) {
        x.multiplyTo(y, r);
        this.reduce(r);
    }

    Montgomery.prototype.convert = montConvert;
    Montgomery.prototype.revert = montRevert;
    Montgomery.prototype.reduce = montReduce;
    Montgomery.prototype.mulTo = montMulTo;
    Montgomery.prototype.sqrTo = montSqrTo;

// (protected) true iff this is even
    function bnpIsEven() { return ((this.t > 0) ? (this[0] & 1) : this.s) == 0; }

// (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
    function bnpExp(e, z) {
        if (e > 0xffffffff || e < 1) return BigInteger.ONE;
        var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e) - 1;
        g.copyTo(r);
        while (--i >= 0) {
            z.sqrTo(r, r2);
            if ((e & (1 << i)) > 0) z.mulTo(r2, g, r);
            else {
                var t = r;
                r = r2;
                r2 = t;
            }
        }
        return z.revert(r);
    }

// (public) this^e % m, 0 <= e < 2^32
    function bnModPowInt(e, m) {
        var z;
        if (e < 256 || m.isEven()) z = new Classic(m);
        else z = new Montgomery(m);
        return this.exp(e, z);
    }

// protected
    BigInteger.prototype.copyTo = bnpCopyTo;
    BigInteger.prototype.fromInt = bnpFromInt;
    BigInteger.prototype.fromString = bnpFromString;
    BigInteger.prototype.clamp = bnpClamp;
    BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
    BigInteger.prototype.drShiftTo = bnpDRShiftTo;
    BigInteger.prototype.lShiftTo = bnpLShiftTo;
    BigInteger.prototype.rShiftTo = bnpRShiftTo;
    BigInteger.prototype.subTo = bnpSubTo;
    BigInteger.prototype.multiplyTo = bnpMultiplyTo;
    BigInteger.prototype.squareTo = bnpSquareTo;
    BigInteger.prototype.divRemTo = bnpDivRemTo;
    BigInteger.prototype.invDigit = bnpInvDigit;
    BigInteger.prototype.isEven = bnpIsEven;
    BigInteger.prototype.exp = bnpExp;

// public
    BigInteger.prototype.toString = bnToString;
    BigInteger.prototype.negate = bnNegate;
    BigInteger.prototype.abs = bnAbs;
    BigInteger.prototype.compareTo = bnCompareTo;
    BigInteger.prototype.bitLength = bnBitLength;
    BigInteger.prototype.mod = bnMod;
    BigInteger.prototype.modPowInt = bnModPowInt;

// "constants"
    BigInteger.ZERO = nbv(0);
    BigInteger.ONE = nbv(1);

// Copyright (c) 2005-2009  Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Extended JavaScript BN functions, required for RSA private ops.

// Version 1.1: new BigInteger("0", 10) returns "proper" zero
// Version 1.2: square() API, isProbablePrime fix

// (public)
    function bnClone() {
        var r = nbi();
        this.copyTo(r);
        return r;
    }

// (public) return value as integer
    function bnIntValue() {
        if (this.s < 0) {
            if (this.t == 1) return this[0] - this.DV;
            else if (this.t == 0) return -1;
        } else if (this.t == 1) return this[0];
        else if (this.t == 0) return 0;
        // assumes 16 < DB < 32
        return ((this[1] & ((1 << (32 - this.DB)) - 1)) << this.DB) | this[0];
    }

// (public) return value as byte
    function bnByteValue() { return (this.t == 0) ? this.s : (this[0] << 24) >> 24; }

// (public) return value as short (assumes DB>=16)
    function bnShortValue() { return (this.t == 0) ? this.s : (this[0] << 16) >> 16; }

// (protected) return x s.t. r^x < DV
    function bnpChunkSize(r) { return Math.floor(Math.LN2 * this.DB / Math.log(r)); }

// (public) 0 if this == 0, 1 if this > 0
    function bnSigNum() {
        if (this.s < 0) return -1;
        else if (this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
        else return 1;
    }

// (protected) convert to radix string
    function bnpToRadix(b) {
        if (b == null) b = 10;
        if (this.signum() == 0 || b < 2 || b > 36) return "0";
        var cs = this.chunkSize(b);
        var a = Math.pow(b, cs);
        var d = nbv(a), y = nbi(), z = nbi(), r = "";
        this.divRemTo(d, y, z);
        while (y.signum() > 0) {
            r = (a + z.intValue()).toString(b).substr(1) + r;
            y.divRemTo(d, y, z);
        }
        return z.intValue().toString(b) + r;
    }

// (protected) convert from radix string
    function bnpFromRadix(s, b) {
        this.fromInt(0);
        if (b == null) b = 10;
        var cs = this.chunkSize(b);
        var d = Math.pow(b, cs), mi = false, j = 0, w = 0;
        for (var i = 0; i < s.length; ++i) {
            var x = intAt(s, i);
            if (x < 0) {
                if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
                continue;
            }
            w = b * w + x;
            if (++j >= cs) {
                this.dMultiply(d);
                this.dAddOffset(w, 0);
                j = 0;
                w = 0;
            }
        }
        if (j > 0) {
            this.dMultiply(Math.pow(b, j));
            this.dAddOffset(w, 0);
        }
        if (mi) BigInteger.ZERO.subTo(this, this);
    }

// (protected) alternate constructor
    function bnpFromNumber(a, b, c) {
        if ("number" == typeof b) {
            // new BigInteger(int,int,RNG)
            if (a < 2) this.fromInt(1);
            else {
                this.fromNumber(a, c);
                if (!this.testBit(a - 1)) // force MSB set
                    this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
                if (this.isEven()) this.dAddOffset(1, 0); // force odd
                while (!this.isProbablePrime(b)) {
                    this.dAddOffset(2, 0);
                    if (this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
                }
            }
        } else {
            // new BigInteger(int,RNG)
            var x = new Array(), t = a & 7;
            x.length = (a >> 3) + 1;
            b.nextBytes(x);
            if (t > 0) x[0] &= ((1 << t) - 1);
            else x[0] = 0;
            this.fromString(x, 256);
        }
    }

// (public) convert to bigendian byte array
    function bnToByteArray() {
        var i = this.t, r = new Array();
        r[0] = this.s;
        var p = this.DB - (i * this.DB) % 8, d, k = 0;
        if (i-- > 0) {
            if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p)
                r[k++] = d | (this.s << (this.DB - p));
            while (i >= 0) {
                if (p < 8) {
                    d = (this[i] & ((1 << p) - 1)) << (8 - p);
                    d |= this[--i] >> (p += this.DB - 8);
                } else {
                    d = (this[i] >> (p -= 8)) & 0xff;
                    if (p <= 0) {
                        p += this.DB;
                        --i;
                    }
                }
                if ((d & 0x80) != 0) d |= -256;
                if (k == 0 && (this.s & 0x80) != (d & 0x80))++k;
                if (k > 0 || d != this.s) r[k++] = d;
            }
        }
        return r;
    }

    function bnEquals(a) { return (this.compareTo(a) == 0); }

    function bnMin(a) { return (this.compareTo(a) < 0) ? this : a; }

    function bnMax(a) { return (this.compareTo(a) > 0) ? this : a; }

// (protected) r = this op a (bitwise)
    function bnpBitwiseTo(a, op, r) {
        var i, f, m = Math.min(a.t, this.t);
        for (i = 0; i < m; ++i) r[i] = op(this[i], a[i]);
        if (a.t < this.t) {
            f = a.s & this.DM;
            for (i = m; i < this.t; ++i) r[i] = op(this[i], f);
            r.t = this.t;
        } else {
            f = this.s & this.DM;
            for (i = m; i < a.t; ++i) r[i] = op(f, a[i]);
            r.t = a.t;
        }
        r.s = op(this.s, a.s);
        r.clamp();
    }

// (public) this & a
    function op_and(x, y) { return x & y; }

    function bnAnd(a) {
        var r = nbi();
        this.bitwiseTo(a, op_and, r);
        return r;
    }

// (public) this | a
    function op_or(x, y) { return x | y; }

    function bnOr(a) {
        var r = nbi();
        this.bitwiseTo(a, op_or, r);
        return r;
    }

// (public) this ^ a
    function op_xor(x, y) { return x ^ y; }

    function bnXor(a) {
        var r = nbi();
        this.bitwiseTo(a, op_xor, r);
        return r;
    }

// (public) this & ~a
    function op_andnot(x, y) { return x & ~y; }

    function bnAndNot(a) {
        var r = nbi();
        this.bitwiseTo(a, op_andnot, r);
        return r;
    }

// (public) ~this
    function bnNot() {
        var r = nbi();
        for (var i = 0; i < this.t; ++i) r[i] = this.DM & ~this[i];
        r.t = this.t;
        r.s = ~this.s;
        return r;
    }

// (public) this << n
    function bnShiftLeft(n) {
        var r = nbi();
        if (n < 0) this.rShiftTo(-n, r);
        else this.lShiftTo(n, r);
        return r;
    }

// (public) this >> n
    function bnShiftRight(n) {
        var r = nbi();
        if (n < 0) this.lShiftTo(-n, r);
        else this.rShiftTo(n, r);
        return r;
    }

// return index of lowest 1-bit in x, x < 2^31
    function lbit(x) {
        if (x == 0) return -1;
        var r = 0;
        if ((x & 0xffff) == 0) {
            x >>= 16;
            r += 16;
        }
        if ((x & 0xff) == 0) {
            x >>= 8;
            r += 8;
        }
        if ((x & 0xf) == 0) {
            x >>= 4;
            r += 4;
        }
        if ((x & 3) == 0) {
            x >>= 2;
            r += 2;
        }
        if ((x & 1) == 0)++r;
        return r;
    }

// (public) returns index of lowest 1-bit (or -1 if none)
    function bnGetLowestSetBit() {
        for (var i = 0; i < this.t; ++i)
            if (this[i] != 0) return i * this.DB + lbit(this[i]);
        if (this.s < 0) return this.t * this.DB;
        return -1;
    }

// return number of 1 bits in x
    function cbit(x) {
        var r = 0;
        while (x != 0) {
            x &= x - 1;
            ++r;
        }
        return r;
    }

// (public) return number of set bits
    function bnBitCount() {
        var r = 0, x = this.s & this.DM;
        for (var i = 0; i < this.t; ++i) r += cbit(this[i] ^ x);
        return r;
    }

// (public) true iff nth bit is set
    function bnTestBit(n) {
        var j = Math.floor(n / this.DB);
        if (j >= this.t) return (this.s != 0);
        return ((this[j] & (1 << (n % this.DB))) != 0);
    }

// (protected) this op (1<<n)
    function bnpChangeBit(n, op) {
        var r = BigInteger.ONE.shiftLeft(n);
        this.bitwiseTo(r, op, r);
        return r;
    }

// (public) this | (1<<n)
    function bnSetBit(n) { return this.changeBit(n, op_or); }

// (public) this & ~(1<<n)
    function bnClearBit(n) { return this.changeBit(n, op_andnot); }

// (public) this ^ (1<<n)
    function bnFlipBit(n) { return this.changeBit(n, op_xor); }

// (protected) r = this + a
    function bnpAddTo(a, r) {
        var i = 0, c = 0, m = Math.min(a.t, this.t);
        while (i < m) {
            c += this[i] + a[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
        }
        if (a.t < this.t) {
            c += a.s;
            while (i < this.t) {
                c += this[i];
                r[i++] = c & this.DM;
                c >>= this.DB;
            }
            c += this.s;
        } else {
            c += this.s;
            while (i < a.t) {
                c += a[i];
                r[i++] = c & this.DM;
                c >>= this.DB;
            }
            c += a.s;
        }
        r.s = (c < 0) ? -1 : 0;
        if (c > 0) r[i++] = c;
        else if (c < -1) r[i++] = this.DV + c;
        r.t = i;
        r.clamp();
    }

// (public) this + a
    function bnAdd(a) {
        var r = nbi();
        this.addTo(a, r);
        return r;
    }

// (public) this - a
    function bnSubtract(a) {
        var r = nbi();
        this.subTo(a, r);
        return r;
    }

// (public) this * a
    function bnMultiply(a) {
        var r = nbi();
        this.multiplyTo(a, r);
        return r;
    }

// (public) this^2
    function bnSquare() {
        var r = nbi();
        this.squareTo(r);
        return r;
    }

// (public) this / a
    function bnDivide(a) {
        var r = nbi();
        this.divRemTo(a, r, null);
        return r;
    }

// (public) this % a
    function bnRemainder(a) {
        var r = nbi();
        this.divRemTo(a, null, r);
        return r;
    }

// (public) [this/a,this%a]
    function bnDivideAndRemainder(a) {
        var q = nbi(), r = nbi();
        this.divRemTo(a, q, r);
        return new Array(q, r);
    }

// (protected) this *= n, this >= 0, 1 < n < DV
    function bnpDMultiply(n) {
        this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
        ++this.t;
        this.clamp();
    }

// (protected) this += n << w words, this >= 0
    function bnpDAddOffset(n, w) {
        if (n == 0) return;
        while (this.t <= w) this[this.t++] = 0;
        this[w] += n;
        while (this[w] >= this.DV) {
            this[w] -= this.DV;
            if (++w >= this.t) this[this.t++] = 0;
            ++this[w];
        }
    }

// A "null" reducer
    function NullExp() {}

    function nNop(x) { return x; }

    function nMulTo(x, y, r) { x.multiplyTo(y, r); }

    function nSqrTo(x, r) { x.squareTo(r); }

    NullExp.prototype.convert = nNop;
    NullExp.prototype.revert = nNop;
    NullExp.prototype.mulTo = nMulTo;
    NullExp.prototype.sqrTo = nSqrTo;

// (public) this^e
    function bnPow(e) { return this.exp(e, new NullExp()); }

// (protected) r = lower n words of "this * a", a.t <= n
// "this" should be the larger one if appropriate.
    function bnpMultiplyLowerTo(a, n, r) {
        var i = Math.min(this.t + a.t, n);
        r.s = 0; // assumes a,this >= 0
        r.t = i;
        while (i > 0) r[--i] = 0;
        var j;
        for (j = r.t - this.t; i < j; ++i) r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);
        for (j = Math.min(a.t, n); i < j; ++i) this.am(0, a[i], r, i, 0, n - i);
        r.clamp();
    }

// (protected) r = "this * a" without lower n words, n > 0
// "this" should be the larger one if appropriate.
    function bnpMultiplyUpperTo(a, n, r) {
        --n;
        var i = r.t = this.t + a.t - n;
        r.s = 0; // assumes a,this >= 0
        while (--i >= 0) r[i] = 0;
        for (i = Math.max(n - this.t, 0); i < a.t; ++i)
            r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);
        r.clamp();
        r.drShiftTo(1, r);
    }

// Barrett modular reduction
    function Barrett(m) {
        // setup Barrett
        this.r2 = nbi();
        this.q3 = nbi();
        BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
        this.mu = this.r2.divide(m);
        this.m = m;
    }

    function barrettConvert(x) {
        if (x.s < 0 || x.t > 2 * this.m.t) return x.mod(this.m);
        else if (x.compareTo(this.m) < 0) return x;
        else {
            var r = nbi();
            x.copyTo(r);
            this.reduce(r);
            return r;
        }
    }

    function barrettRevert(x) { return x; }

// x = x mod m (HAC 14.42)
    function barrettReduce(x) {
        x.drShiftTo(this.m.t - 1, this.r2);
        if (x.t > this.m.t + 1) {
            x.t = this.m.t + 1;
            x.clamp();
        }
        this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
        this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
        while (x.compareTo(this.r2) < 0) x.dAddOffset(1, this.m.t + 1);
        x.subTo(this.r2, x);
        while (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
    }

// r = x^2 mod m; x != r
    function barrettSqrTo(x, r) {
        x.squareTo(r);
        this.reduce(r);
    }

// r = x*y mod m; x,y != r
    function barrettMulTo(x, y, r) {
        x.multiplyTo(y, r);
        this.reduce(r);
    }

    Barrett.prototype.convert = barrettConvert;
    Barrett.prototype.revert = barrettRevert;
    Barrett.prototype.reduce = barrettReduce;
    Barrett.prototype.mulTo = barrettMulTo;
    Barrett.prototype.sqrTo = barrettSqrTo;

// (public) this^e % m (HAC 14.85)
    function bnModPow(e, m) {
        var i = e.bitLength(), k, r = nbv(1), z;
        if (i <= 0) return r;
        else if (i < 18) k = 1;
        else if (i < 48) k = 3;
        else if (i < 144) k = 4;
        else if (i < 768) k = 5;
        else k = 6;
        if (i < 8)
            z = new Classic(m);
        else if (m.isEven())
            z = new Barrett(m);
        else
            z = new Montgomery(m);

        // precomputation
        var g = new Array(), n = 3, k1 = k - 1, km = (1 << k) - 1;
        g[1] = z.convert(this);
        if (k > 1) {
            var g2 = nbi();
            z.sqrTo(g[1], g2);
            while (n <= km) {
                g[n] = nbi();
                z.mulTo(g2, g[n - 2], g[n]);
                n += 2;
            }
        }

        var j = e.t - 1, w, is1 = true, r2 = nbi(), t;
        i = nbits(e[j]) - 1;
        while (j >= 0) {
            if (i >= k1) w = (e[j] >> (i - k1)) & km;
            else {
                w = (e[j] & ((1 << (i + 1)) - 1)) << (k1 - i);
                if (j > 0) w |= e[j - 1] >> (this.DB + i - k1);
            }

            n = k;
            while ((w & 1) == 0) {
                w >>= 1;
                --n;
            }
            if ((i -= n) < 0) {
                i += this.DB;
                --j;
            }
            if (is1) { // ret == 1, don't bother squaring or multiplying it
                g[w].copyTo(r);
                is1 = false;
            } else {
                while (n > 1) {
                    z.sqrTo(r, r2);
                    z.sqrTo(r2, r);
                    n -= 2;
                }
                if (n > 0) z.sqrTo(r, r2);
                else {
                    t = r;
                    r = r2;
                    r2 = t;
                }
                z.mulTo(r2, g[w], r);
            }

            while (j >= 0 && (e[j] & (1 << i)) == 0) {
                z.sqrTo(r, r2);
                t = r;
                r = r2;
                r2 = t;
                if (--i < 0) {
                    i = this.DB - 1;
                    --j;
                }
            }
        }
        return z.revert(r);
    }

// (public) gcd(this,a) (HAC 14.54)
    function bnGCD(a) {
        var x = (this.s < 0) ? this.negate() : this.clone();
        var y = (a.s < 0) ? a.negate() : a.clone();
        if (x.compareTo(y) < 0) {
            var t = x;
            x = y;
            y = t;
        }
        var i = x.getLowestSetBit(), g = y.getLowestSetBit();
        if (g < 0) return x;
        if (i < g) g = i;
        if (g > 0) {
            x.rShiftTo(g, x);
            y.rShiftTo(g, y);
        }
        while (x.signum() > 0) {
            if ((i = x.getLowestSetBit()) > 0) x.rShiftTo(i, x);
            if ((i = y.getLowestSetBit()) > 0) y.rShiftTo(i, y);
            if (x.compareTo(y) >= 0) {
                x.subTo(y, x);
                x.rShiftTo(1, x);
            } else {
                y.subTo(x, y);
                y.rShiftTo(1, y);
            }
        }
        if (g > 0) y.lShiftTo(g, y);
        return y;
    }

// (protected) this % n, n < 2^26
    function bnpModInt(n) {
        if (n <= 0) return 0;
        var d = this.DV % n, r = (this.s < 0) ? n - 1 : 0;
        if (this.t > 0)
            if (d == 0) r = this[0] % n;
            else for (var i = this.t - 1; i >= 0; --i) r = (d * r + this[i]) % n;
        return r;
    }

// (public) 1/this % m (HAC 14.61)
    function bnModInverse(m) {
        var ac = m.isEven();
        if ((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
        var u = m.clone(), v = this.clone();
        var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
        while (u.signum() != 0) {
            while (u.isEven()) {
                u.rShiftTo(1, u);
                if (ac) {
                    if (!a.isEven() || !b.isEven()) {
                        a.addTo(this, a);
                        b.subTo(m, b);
                    }
                    a.rShiftTo(1, a);
                } else if (!b.isEven()) b.subTo(m, b);
                b.rShiftTo(1, b);
            }
            while (v.isEven()) {
                v.rShiftTo(1, v);
                if (ac) {
                    if (!c.isEven() || !d.isEven()) {
                        c.addTo(this, c);
                        d.subTo(m, d);
                    }
                    c.rShiftTo(1, c);
                } else if (!d.isEven()) d.subTo(m, d);
                d.rShiftTo(1, d);
            }
            if (u.compareTo(v) >= 0) {
                u.subTo(v, u);
                if (ac) a.subTo(c, a);
                b.subTo(d, b);
            } else {
                v.subTo(u, v);
                if (ac) c.subTo(a, c);
                d.subTo(b, d);
            }
        }
        if (v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
        if (d.compareTo(m) >= 0) return d.subtract(m);
        if (d.signum() < 0) d.addTo(m, d);
        else return d;
        if (d.signum() < 0) return d.add(m);
        else return d;
    }

    var lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];
    var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];

// (public) test primality with certainty >= 1-.5^t
    function bnIsProbablePrime(t) {
        var i, x = this.abs();
        if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
            for (i = 0; i < lowprimes.length; ++i)
                if (x[0] == lowprimes[i]) return true;
            return false;
        }
        if (x.isEven()) return false;
        i = 1;
        while (i < lowprimes.length) {
            var m = lowprimes[i], j = i + 1;
            while (j < lowprimes.length && m < lplim) m *= lowprimes[j++];
            m = x.modInt(m);
            while (i < j) if (m % lowprimes[i++] == 0) return false;
        }
        return x.millerRabin(t);
    }

// (protected) true if probably prime (HAC 4.24, Miller-Rabin)
    function bnpMillerRabin(t) {
        var n1 = this.subtract(BigInteger.ONE);
        var k = n1.getLowestSetBit();
        if (k <= 0) return false;
        var r = n1.shiftRight(k);
        t = (t + 1) >> 1;
        if (t > lowprimes.length) t = lowprimes.length;
        var a = nbi();
        for (var i = 0; i < t; ++i) {
            //Pick bases at random, instead of starting at 2
            a.fromInt(lowprimes[Math.floor(Math.random() * lowprimes.length)]);
            var y = a.modPow(r, this);
            if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
                var j = 1;
                while (j++ < k && y.compareTo(n1) != 0) {
                    y = y.modPowInt(2, this);
                    if (y.compareTo(BigInteger.ONE) == 0) return false;
                }
                if (y.compareTo(n1) != 0) return false;
            }
        }
        return true;
    }

// protected
    BigInteger.prototype.chunkSize = bnpChunkSize;
    BigInteger.prototype.toRadix = bnpToRadix;
    BigInteger.prototype.fromRadix = bnpFromRadix;
    BigInteger.prototype.fromNumber = bnpFromNumber;
    BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
    BigInteger.prototype.changeBit = bnpChangeBit;
    BigInteger.prototype.addTo = bnpAddTo;
    BigInteger.prototype.dMultiply = bnpDMultiply;
    BigInteger.prototype.dAddOffset = bnpDAddOffset;
    BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
    BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
    BigInteger.prototype.modInt = bnpModInt;
    BigInteger.prototype.millerRabin = bnpMillerRabin;

// public
    BigInteger.prototype.clone = bnClone;
    BigInteger.prototype.intValue = bnIntValue;
    BigInteger.prototype.byteValue = bnByteValue;
    BigInteger.prototype.shortValue = bnShortValue;
    BigInteger.prototype.signum = bnSigNum;
    BigInteger.prototype.toByteArray = bnToByteArray;
    BigInteger.prototype.equals = bnEquals;
    BigInteger.prototype.min = bnMin;
    BigInteger.prototype.max = bnMax;
    BigInteger.prototype.and = bnAnd;
    BigInteger.prototype.or = bnOr;
    BigInteger.prototype.xor = bnXor;
    BigInteger.prototype.andNot = bnAndNot;
    BigInteger.prototype.not = bnNot;
    BigInteger.prototype.shiftLeft = bnShiftLeft;
    BigInteger.prototype.shiftRight = bnShiftRight;
    BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
    BigInteger.prototype.bitCount = bnBitCount;
    BigInteger.prototype.testBit = bnTestBit;
    BigInteger.prototype.setBit = bnSetBit;
    BigInteger.prototype.clearBit = bnClearBit;
    BigInteger.prototype.flipBit = bnFlipBit;
    BigInteger.prototype.add = bnAdd;
    BigInteger.prototype.subtract = bnSubtract;
    BigInteger.prototype.multiply = bnMultiply;
    BigInteger.prototype.divide = bnDivide;
    BigInteger.prototype.remainder = bnRemainder;
    BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
    BigInteger.prototype.modPow = bnModPow;
    BigInteger.prototype.modInverse = bnModInverse;
    BigInteger.prototype.pow = bnPow;
    BigInteger.prototype.gcd = bnGCD;
    BigInteger.prototype.isProbablePrime = bnIsProbablePrime;

    // JSBN-specific extension
    BigInteger.prototype.square = bnSquare;

    return BigInteger;
});
;(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('SRPClient', [
            'sha1',
            'sjcl',
            'BigInteger'
        ], factory);
    } else {
        window.SRPClient = factory(sha1, sjcl, BigInteger);
    }
})(function (sha1, sjcl, BigInteger) {
    
    /*
     * Construct an SRP object with a username,
     * password, and the bits identifying the 
     * group (1024 [default], 1536 or 2048 bits).
     */
    var SRPClient = function (username, password, group, hashFn) {

        // Verify presence of username.
        if (!username)
            throw 'Username cannot be empty.';

        // Store username/password.
        this.username = username;
        this.password = password;

        // Initialize hash function
        this.hashFn = hashFn || 'sha-1';

        // Retrieve initialization values.
        var group = group || 1024;
        var initVal = this.initVals[group];

        // Set N and g from initialization values.
        this.N = new BigInteger(initVal.N, 16);
        this.g = new BigInteger(initVal.g, 16);
        this.gBn = new BigInteger(initVal.g, 16);

        // Pre-compute k from N and g.
        this.k = this.k();

        // Convenience big integer objects for 1 and 2.
        this.one = new BigInteger("1", 16);
        this.two = new BigInteger("2", 16);

    };

    /*
     * Implementation of an SRP client conforming
     * to the SRP protocol 6A (see RFC5054).
    */
    SRPClient.prototype = {
        toHexString: function(bi) {
            var hex = bi.toString(16);
            if (hex.length % 2 === 1) {
                hex = "0" + hex;
            }
            return hex;
        },
        padLeft: function(orig, len) {
            if (orig.length > len) return orig;

            var arr = Array(len - orig.length + 1);
            return arr.join("0") + orig;
        },
        bytesToHex: function(bytes) {
            var self = this;
            var b = bytes.map(function(x) { return self.padLeft(self.toHexString(x), 2); });
            return b.join("");
        },
        hexToBytes: function(hex) {
            if (hex.length % 2 === 1) throw new Error("hexToBytes can't have a string with an odd number of characters.");
            if (hex.indexOf("0x") === 0) hex = hex.slice(2);
            return hex.match(/../g).map(function(x) { return parseInt(x, 16) });
        },
        stringToBytes: function(str) {
            var bytes = [];
            for (var i = 0; i < str.length; ++i) {
                bytes.push(str.charCodeAt(i));
            }
            return bytes;
        },
        bytesToString: function (byteArr) {
            var str = '';
            for (var i = 0; i < byteArr.length; i++)
                str += String.fromCharCode(byteArr[i]);

            return str;
        },

        /*
     * Calculate k = H(N || g), which is used
     * throughout various SRP calculations.
     */
        k: function() {

            // Convert to hex values.
            var toHash = [
                this.toHexString(this.N),
                this.toHexString(this.g)
            ];

            // Return hash as a BigInteger.
            return this.paddedHash(toHash);

        },

        /*
     * Calculate x = SHA1(s | SHA1(I | ":" | P))
     */
        calculateX: function(saltHex) {

            // Verify presence of parameters.
            if (!saltHex) throw 'Missing parameter.'

            if (!this.username || !this.password)
                throw 'Username and password cannot be empty.';

            var usernameBytes = this.stringToBytes(this.username);
            var passwordBytes = this.hexToBytes(this.password);

            var upBytes = usernameBytes.concat([58]).concat(passwordBytes);
            var upHash = this.hash(this.bytesToString(upBytes));
            var upHashBytes = this.hexToBytes(upHash);

            var saltBytes = this.hexToBytes(saltHex);
            var saltUpBytes = saltBytes.concat(upHashBytes);
            var saltUpHash = this.hash(this.bytesToString(saltUpBytes));

            var xtmp = new BigInteger(saltUpHash, 16);
            if (xtmp.compareTo(this.N) < 0) {
                return xtmp;
            }
            else {
                var one = new BigInteger(1,16);
                return xtmp.mod(this.N.subtract(one));
            }

        },

        /*
     * Calculate v = g^x % N
     */
        calculateV: function(salt) {

            // Verify presence of parameters.
            if (!salt) throw 'Missing parameter.';

            // Get X from the salt value.
            var x = this.calculateX(salt);

            // Calculate and return the verifier.
            return this.g.modPow(x, this.N);

        },

        /*
     * Calculate u = SHA1(PAD(A) | PAD(B)), which serves
     * to prevent an attacker who learns a user's verifier
     * from being able to authenticate as that user.
     */
        calculateU: function(A, B) {

            // Verify presence of parameters.
            if (!A || !B) throw 'Missing parameter(s).';

            // Verify value of A and B.
            if (A.mod(this.N).toString() == '0' ||
                B.mod(this.N).toString() == '0')
                throw 'ABORT: illegal_parameter';

            // Convert A and B to hexadecimal.
            var toHash = [this.toHexString(A), this.toHexString(B)];

            // Return hash as a BigInteger.
            return this.paddedHash(toHash);

        },

        canCalculateA: function(a) {
            if (!a) throw 'Missing parameter.';

            return Math.ceil(a.bitLength() / 8) >= 256 / 8;

        },

        /*
     * 2.5.4 Calculate the client's public value A = g^a % N,
     * where a is a random number at least 256 bits in length.
     */
        calculateA: function(a) {

            // Verify presence of parameter.
            if (!a) throw 'Missing parameter.';

            if (!this.canCalculateA(a))
                throw 'Client key length is less than 256 bits.'

            // Return A as a BigInteger.
            var A = this.g.modPow(a, this.N);

            if (A.mod(this.N).toString() == '0')
                throw 'ABORT: illegal_parameter';

            return A;

        },

        /*
    * Calculate match M = H(H(N) XOR H(g) | H(username) | s | A | B | K)
    */
        calculateM1: function(A, B, K, salt) {

            // Verify presence of parameters.
            if (!A || !B || !K || !salt)
                throw 'Missing parameter(s).';

            // Verify value of A and B.
            if (A.mod(this.N).toString() == '0' ||
                B.mod(this.N).toString() == '0')
                throw 'ABORT: illegal_parameter';

            var hashN = this.hexHash(this.toHexString(this.N));
            var hashg = this.hexHash(this.toHexString(this.g));

            var hashUsername = this.hash(this.username);

            var xorNg_bytes = [],
                hashN_bytes = this.hexToBytes(hashN),
                hashg_bytes = this.hexToBytes(hashg);

            for (var i = 0; i < hashN_bytes.length; i++)
                xorNg_bytes[i] = hashN_bytes[i] ^ hashg_bytes[i];

            var xorNg = this.bytesToHex(xorNg_bytes);

            var aHex = this.toHexString(A);
            var bHex = this.toHexString(B);

            var toHash = [xorNg, hashUsername, salt, aHex, bHex, K];
            var toHash_str = '';

            for (var j = 0; j < toHash.length; j++) {
                toHash_str += toHash[j];
            }

            return new BigInteger(this.hexHash(toHash_str), 16);
        },

        /*
     * Calculate match M = H(H(N) XOR H(g) | H(username) | s | A | B | K) and return as hex string
     */
        calculateM: function (A, B, K, salt) {

            // Verify presence of parameters.
            if (!A || !B || !K || !salt)
                throw 'Missing parameter(s).';

            // Verify value of A and B.
            if (A.mod(this.N).toString() == '0' ||
                B.mod(this.N).toString() == '0')
                throw 'ABORT: illegal_parameter';

            var hashN = this.hexHash(this.toHexString(this.N));
            var hashg = this.hexHash(this.toHexString(this.g));

            var hashUsername = this.hash(this.username);

            var xorNg_bytes = [],
                hashN_bytes = this.hexToBytes(hashN),
                hashg_bytes = this.hexToBytes(hashg);

            for (var i = 0; i < hashN_bytes.length; i++)
                xorNg_bytes[i] = hashN_bytes[i] ^ hashg_bytes[i];

            var xorNg = this.bytesToHex(xorNg_bytes);

            var aHex = this.toHexString(A);
            var bHex = this.toHexString(B);

            var toHash = [xorNg, hashUsername, salt, aHex, bHex, K];
            var toHash_str = '';

            for (var j = 0; j < toHash.length; j++) {
                toHash_str += toHash[j];
            }

            return this.hexHash(toHash_str);
        },
        /*
     * Calculate match M = H(A, B, K) or M = H(A, M, K)
     */
        calculateM2: function(A, B_or_M, K) {

            // Verify presence of parameters.
            if (!A || !B_or_M || !K)
                throw 'Missing parameter(s).';

            // Verify value of A and B.
            if (A.mod(this.N).toString() == '0' ||
                B_or_M.mod(this.N).toString() == '0')
                throw 'ABORT: illegal_parameter';

            var aHex = this.toHexString(A);
            var bHex = this.toHexString(B_or_M);

            var toHash = [aHex, bHex, K];
            var toHash_str = '';

            for (var j = 0; j < toHash.length; j++) {
                toHash_str += toHash[j];
            }

            return new BigInteger(this.hexHash(toHash_str), 16);

        },

        /*
     * Calculate the client's premaster secret 
     * S = (B - (k * g^x)) ^ (a + (u * x)) % N
     */
        calculateS: function(B, salt, uu, aa) {

            // Verify presence of parameters.
            if (!B || !salt || !uu || !aa)
                throw 'Missing parameters.';

            // Verify value of B.
            if (B.mod(this.N).toString() == '0')
                throw 'ABORT: illegal_parameter';

            // Calculate X from the salt.
            var x = this.calculateX(salt);

            // Calculate bx = g^x % N
            var bx = this.g.modPow(x, this.N);

            // Calculate ((B + N * k) - k * bx) % N
            var btmp = B.add(this.N.multiply(this.k))
                .subtract(bx.multiply(this.k)).mod(this.N);

            // Finish calculation of the premaster secret.
            return btmp.modPow(x.multiply(uu).add(aa), this.N);

        },

        calculateK: function(S) {
            return this.hexHash(this.toHexString(S));
        },

        /*
     * Helper functions for random number
     * generation and format conversion.
     */

        /* Generate a random big integer */
        srpRandom: function() {

            var words = sjcl.random.randomWords(8, 0);
            var hex = sjcl.codec.hex.fromBits(words);

            // Verify random number large enough.
            if (hex.length != 64)
                throw 'Invalid random number size.'

            var r = new BigInteger(hex, 16);

            if (r.compareTo(this.N) >= 0)
                r = a.mod(this.N.subtract(this.one));

            if (r.compareTo(this.two) < 0)
                r = two;

            return r;

        },

        /* Return a random hexadecimal salt */
        randomHexSalt: function() {

            var words = sjcl.random.randomWords(8, 0);
            var hex = sjcl.codec.hex.fromBits(words);

            return hex;

        },

        /*
     * Helper functions for hasing/padding.
     */

        /*
    * SHA1 hashing function with padding: input 
    * is prefixed with 0 to meet N hex width.
    */
        paddedHash: function(array) {

            var nlen = 2 * ((this.toHexString(this.N).length * 4 + 7) >> 3);

            var toHash = '';

            for (var i = 0; i < array.length; i++) {
                toHash += this.nZeros(nlen - array[i].length) + array[i];
            }

            var hash = new BigInteger(this.hexHash(toHash), 16);

            return hash.mod(this.N);

        },

        /* 
     * Generic hashing function.
     */
        hash: function(str) {

            switch (this.hashFn.toLowerCase()) {

            case 'sha-256':
                var s = sjcl.codec.hex.fromBits(
                    sjcl.hash.sha256.hash(str));
                return this.nZeros(64 - s.length) + s;

            case 'sha-1':
            default:
                return sha1.calcSHA1(str);

            }
        },

        /*
     * Hexadecimal hashing function.
     */
        hexHash: function(str) {
            switch (this.hashFn.toLowerCase()) {

            case 'sha-256':
                var s = sjcl.codec.hex.fromBits(
                    sjcl.hash.sha256.hash(
                        sjcl.codec.hex.toBits(str)));
                return this.nZeros(64 - s.length) + s;

            case 'sha-1':
            default:
                return this.hash(this.pack(str));

            }
        },

        /*
     * Hex to string conversion.
     */
        pack: function(hex) {

            // To prevent null byte termination bug
            if (hex.length % 2 != 0) hex = '0' + hex;

            var i = 0;
            var ascii = '';

            while (i < hex.length / 2) {
                ascii = ascii + String.fromCharCode(
                    parseInt(hex.substr(i * 2, 2), 16));
                i++;
            }

            return ascii;

        },

        /* Return a string with N zeros. */
        nZeros: function(n) {

            if (n < 1) return '';
            var t = this.nZeros(n >> 1);

            return ((n & 1) == 0) ?
                t + t : t + t + '0';

        },

        /*
     * SRP group parameters, composed of N (hexadecimal
     * prime value) and g (decimal group generator).
     * See http://tools.ietf.org/html/rfc5054#appendix-A
     */
        initVals: {
            1024: {
                N: 'EEAF0AB9ADB38DD69C33F80AFA8FC5E86072618775FF3C0B9EA2314C' +
                    '9C256576D674DF7496EA81D3383B4813D692C6E0E0D5D8E250B98BE4' +
                    '8E495C1D6089DAD15DC7D7B46154D6B6CE8EF4AD69B15D4982559B29' +
                    '7BCF1885C529F566660E57EC68EDBC3C05726CC02FD4CBF4976EAA9A' +
                    'FD5138FE8376435B9FC61D2FC0EB06E3',
                g: '2'

            },

            1536: {
                N: '9DEF3CAFB939277AB1F12A8617A47BBBDBA51DF499AC4C80BEEEA961' +
                    '4B19CC4D5F4F5F556E27CBDE51C6A94BE4607A291558903BA0D0F843' +
                    '80B655BB9A22E8DCDF028A7CEC67F0D08134B1C8B97989149B609E0B' +
                    'E3BAB63D47548381DBC5B1FC764E3F4B53DD9DA1158BFD3E2B9C8CF5' +
                    '6EDF019539349627DB2FD53D24B7C48665772E437D6C7F8CE442734A' +
                    'F7CCB7AE837C264AE3A9BEB87F8A2FE9B8B5292E5A021FFF5E91479E' +
                    '8CE7A28C2442C6F315180F93499A234DCF76E3FED135F9BB',
                g: '2'
            },

            2048: {
                N: 'AC6BDB41324A9A9BF166DE5E1389582FAF72B6651987EE07FC319294' +
                    '3DB56050A37329CBB4A099ED8193E0757767A13DD52312AB4B03310D' +
                    'CD7F48A9DA04FD50E8083969EDB767B0CF6095179A163AB3661A05FB' +
                    'D5FAAAE82918A9962F0B93B855F97993EC975EEAA80D740ADBF4FF74' +
                    '7359D041D5C33EA71D281E446B14773BCA97B43A23FB801676BD207A' +
                    '436C6481F1D2B9078717461A5B9D32E688F87748544523B524B0D57D' +
                    '5EA77A2775D2ECFA032CFBDBF52FB3786160279004E57AE6AF874E73' +
                    '03CE53299CCC041C7BC308D82A5698F3A8D0C38271AE35F8E9DBFBB6' +
                    '94B5C803D89F7AE435DE236D525F54759B65E372FCD68EF20FA7111F' +
                    '9E4AFF73',
                g: '2'
            },

            3072: {
                N: 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E08' +
                    '8A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B' +
                    '302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9' +
                    'A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE6' +
                    '49286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8' +
                    'FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
                    '670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C' +
                    '180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF695581718' +
                    '3995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D' +
                    '04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7D' +
                    'B3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D226' +
                    '1AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200C' +
                    'BBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFC' +
                    'E0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF',
                g: '5'
            },

            4096: {
                N: 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E08' +
                    '8A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B' +
                    '302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9' +
                    'A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE6' +
                    '49286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8' +
                    'FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
                    '670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C' +
                    '180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF695581718' +
                    '3995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D' +
                    '04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7D' +
                    'B3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D226' +
                    '1AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200C' +
                    'BBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFC' +
                    'E0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B26' +
                    '99C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB' +
                    '04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2' +
                    '233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127' +
                    'D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C934063199' +
                    'FFFFFFFFFFFFFFFF',
                g: '5'
            },

            6144: {
                N: 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E08' +
                    '8A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B' +
                    '302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9' +
                    'A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE6' +
                    '49286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8' +
                    'FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
                    '670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C' +
                    '180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF695581718' +
                    '3995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D' +
                    '04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7D' +
                    'B3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D226' +
                    '1AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200C' +
                    'BBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFC' +
                    'E0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B26' +
                    '99C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB' +
                    '04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2' +
                    '233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127' +
                    'D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C934028492' +
                    '36C3FAB4D27C7026C1D4DCB2602646DEC9751E763DBA37BDF8FF9406' +
                    'AD9E530EE5DB382F413001AEB06A53ED9027D831179727B0865A8918' +
                    'DA3EDBEBCF9B14ED44CE6CBACED4BB1BDB7F1447E6CC254B33205151' +
                    '2BD7AF426FB8F401378CD2BF5983CA01C64B92ECF032EA15D1721D03' +
                    'F482D7CE6E74FEF6D55E702F46980C82B5A84031900B1C9E59E7C97F' +
                    'BEC7E8F323A97A7E36CC88BE0F1D45B7FF585AC54BD407B22B4154AA' +
                    'CC8F6D7EBF48E1D814CC5ED20F8037E0A79715EEF29BE32806A1D58B' +
                    'B7C5DA76F550AA3D8A1FBFF0EB19CCB1A313D55CDA56C9EC2EF29632' +
                    '387FE8D76E3C0468043E8F663F4860EE12BF2D5B0B7474D6E694F91E' +
                    '6DCC4024FFFFFFFFFFFFFFFF',
                g: '5'
            },

            8192: {
                N: 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E08' +
                    '8A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B' +
                    '302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9' +
                    'A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE6' +
                    '49286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8' +
                    'FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
                    '670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C' +
                    '180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF695581718' +
                    '3995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D' +
                    '04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7D' +
                    'B3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D226' +
                    '1AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200C' +
                    'BBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFC' +
                    'E0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B26' +
                    '99C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB' +
                    '04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2' +
                    '233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127' +
                    'D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C934028492' +
                    '36C3FAB4D27C7026C1D4DCB2602646DEC9751E763DBA37BDF8FF9406' +
                    'AD9E530EE5DB382F413001AEB06A53ED9027D831179727B0865A8918' +
                    'DA3EDBEBCF9B14ED44CE6CBACED4BB1BDB7F1447E6CC254B33205151' +
                    '2BD7AF426FB8F401378CD2BF5983CA01C64B92ECF032EA15D1721D03' +
                    'F482D7CE6E74FEF6D55E702F46980C82B5A84031900B1C9E59E7C97F' +
                    'BEC7E8F323A97A7E36CC88BE0F1D45B7FF585AC54BD407B22B4154AA' +
                    'CC8F6D7EBF48E1D814CC5ED20F8037E0A79715EEF29BE32806A1D58B' +
                    'B7C5DA76F550AA3D8A1FBFF0EB19CCB1A313D55CDA56C9EC2EF29632' +
                    '387FE8D76E3C0468043E8F663F4860EE12BF2D5B0B7474D6E694F91E' +
                    '6DBE115974A3926F12FEE5E438777CB6A932DF8CD8BEC4D073B931BA' +
                    '3BC832B68D9DD300741FA7BF8AFC47ED2576F6936BA424663AAB639C' +
                    '5AE4F5683423B4742BF1C978238F16CBE39D652DE3FDB8BEFC848AD9' +
                    '22222E04A4037C0713EB57A81A23F0C73473FC646CEA306B4BCBC886' +
                    '2F8385DDFA9D4B7FA2C087E879683303ED5BDD3A062B3CF5B3A278A6' +
                    '6D2A13F83F44F82DDF310EE074AB6A364597E899A0255DC164F31CC5' +
                    '0846851DF9AB48195DED7EA1B1D510BD7EE74D73FAF36BC31ECFA268' +
                    '359046F4EB879F924009438B481C6CD7889A002ED5EE382BC9190DA6' +
                    'FC026E479558E4475677E9AA9E3050E2765694DFC81F56E880B96E71' +
                    '60C980DD98EDD3DFFFFFFFFFFFFFFFFF',
                g: '19'
            }

        },

        /*
     * Server-side SRP functions. These should not
     * be used on the client except for debugging.
     */

        /* Calculate the server's public value B. */
        calculateB: function(b, v) {

            // Verify presence of parameters.
            if (!b || !v) throw 'Missing parameters.';

            var bb = this.g.modPow(b, this.N);
            var B = bb.add(v.multiply(this.k)).mod(this.N);

            return B;

        },

        /* Calculate the server's premaster secret */
        calculateServerS: function(A, v, u, B) {

            // Verify presence of parameters.
            if (!A || !v || !u || !B)
                throw 'Missing parameters.';

            // Verify value of A and B.
            if (A.mod(this.N).toString() == '0' ||
                B.mod(this.N).toString() == '0')
                throw 'ABORT: illegal_parameter';

            return v.modPow(u, this.N).multiply(A)
                .mod(this.N).modPow(B, this.N);
        }

    };

    return SRPClient;
});

(function() {
  (function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      return define('ifvisible',function() {
        return factory();
      });
    } else if (typeof exports === 'object') {
      return module.exports = factory();
    } else {
      return root.ifvisible = factory();
    }
  })(this, function() {
    var addEvent, customEvent, doc, fireEvent, hidden, idleStartedTime, idleTime, ie, ifvisible, init, initialized, status, trackIdleStatus, visibilityChange;
    ifvisible = {};
    doc = document;
    initialized = false;
    status = "active";
    idleTime = 60000;
    idleStartedTime = false;
    customEvent = (function() {
      var S4, addCustomEvent, cgid, fireCustomEvent, guid, listeners, removeCustomEvent;
      S4 = function() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
      };
      guid = function() {
        return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
      };
      listeners = {};
      cgid = '__ceGUID';
      addCustomEvent = function(obj, event, callback) {
        obj[cgid] = undefined;
        if (!obj[cgid]) {
          obj[cgid] = "ifvisible.object.event.identifier";
        }
        if (!listeners[obj[cgid]]) {
          listeners[obj[cgid]] = {};
        }
        if (!listeners[obj[cgid]][event]) {
          listeners[obj[cgid]][event] = [];
        }
        return listeners[obj[cgid]][event].push(callback);
      };
      fireCustomEvent = function(obj, event, memo) {
        var ev, j, len, ref, results;
        if (obj[cgid] && listeners[obj[cgid]] && listeners[obj[cgid]][event]) {
          ref = listeners[obj[cgid]][event];
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            ev = ref[j];
            results.push(ev(memo || {}));
          }
          return results;
        }
      };
      removeCustomEvent = function(obj, event, callback) {
        var cl, i, j, len, ref;
        if (callback) {
          if (obj[cgid] && listeners[obj[cgid]] && listeners[obj[cgid]][event]) {
            ref = listeners[obj[cgid]][event];
            for (i = j = 0, len = ref.length; j < len; i = ++j) {
              cl = ref[i];
              if (cl === callback) {
                listeners[obj[cgid]][event].splice(i, 1);
                return cl;
              }
            }
          }
        } else {
          if (obj[cgid] && listeners[obj[cgid]] && listeners[obj[cgid]][event]) {
            return delete listeners[obj[cgid]][event];
          }
        }
      };
      return {
        add: addCustomEvent,
        remove: removeCustomEvent,
        fire: fireCustomEvent
      };
    })();
    addEvent = (function() {
      var setListener;
      setListener = false;
      return function(el, ev, fn) {
        if (!setListener) {
          if (el.addEventListener) {
            setListener = function(el, ev, fn) {
              return el.addEventListener(ev, fn, false);
            };
          } else if (el.attachEvent) {
            setListener = function(el, ev, fn) {
              return el.attachEvent('on' + ev, fn, false);
            };
          } else {
            setListener = function(el, ev, fn) {
              return el['on' + ev] = fn;
            };
          }
        }
        return setListener(el, ev, fn);
      };
    })();
    fireEvent = function(element, event) {
      var evt;
      if (doc.createEventObject) {
        return element.fireEvent('on' + event, evt);
      } else {
        evt = doc.createEvent('HTMLEvents');
        evt.initEvent(event, true, true);
        return !element.dispatchEvent(evt);
      }
    };
    ie = (function() {
      var all, check, div, undef, v;
      undef = void 0;
      v = 3;
      div = doc.createElement("div");
      all = div.getElementsByTagName("i");
      check = function() {
        return (div.innerHTML = "<!--[if gt IE " + (++v) + "]><i></i><![endif]-->", all[0]);
      };
      while (check()) {
        continue;
      }
      if (v > 4) {
        return v;
      } else {
        return undef;
      }
    })();
    hidden = false;
    visibilityChange = void 0;
    if (typeof doc.hidden !== "undefined") {
      hidden = "hidden";
      visibilityChange = "visibilitychange";
    } else if (typeof doc.mozHidden !== "undefined") {
      hidden = "mozHidden";
      visibilityChange = "mozvisibilitychange";
    } else if (typeof doc.msHidden !== "undefined") {
      hidden = "msHidden";
      visibilityChange = "msvisibilitychange";
    } else if (typeof doc.webkitHidden !== "undefined") {
      hidden = "webkitHidden";
      visibilityChange = "webkitvisibilitychange";
    }
    trackIdleStatus = function() {
      var timer, wakeUp;
      timer = false;
      wakeUp = function() {
        clearTimeout(timer);
        if (status !== "active") {
          ifvisible.wakeup();
        }
        idleStartedTime = +(new Date());
        return timer = setTimeout(function() {
          if (status === "active") {
            return ifvisible.idle();
          }
        }, idleTime);
      };
      wakeUp();
      addEvent(doc, "mousemove", wakeUp);
      addEvent(doc, "keyup", wakeUp);
      addEvent(window, "scroll", wakeUp);
      ifvisible.focus(wakeUp);
      return ifvisible.wakeup(wakeUp);
    };
    init = function() {
      var blur;
      if (initialized) {
        return true;
      }
      if (hidden === false) {
        blur = "blur";
        if (ie < 9) {
          blur = "focusout";
        }
        addEvent(window, blur, function() {
          return ifvisible.blur();
        });
        addEvent(window, "focus", function() {
          return ifvisible.focus();
        });
      } else {
        addEvent(doc, visibilityChange, function() {
          if (doc[hidden]) {
            return ifvisible.blur();
          } else {
            return ifvisible.focus();
          }
        }, false);
      }
      initialized = true;
      return trackIdleStatus();
    };
    ifvisible = {
      setIdleDuration: function(seconds) {
        return idleTime = seconds * 1000;
      },
      getIdleDuration: function() {
        return idleTime;
      },
      getIdleInfo: function() {
        var now, res;
        now = +(new Date());
        res = {};
        if (status === "idle") {
          res.isIdle = true;
          res.idleFor = now - idleStartedTime;
          res.timeLeft = 0;
          res.timeLeftPer = 100;
        } else {
          res.isIdle = false;
          res.idleFor = now - idleStartedTime;
          res.timeLeft = (idleStartedTime + idleTime) - now;
          res.timeLeftPer = (100 - (res.timeLeft * 100 / idleTime)).toFixed(2);
        }
        return res;
      },
      focus: function(callback) {
        if (typeof callback === "function") {
          return this.on("focus", callback);
        }
        status = "active";
        customEvent.fire(this, "focus");
        customEvent.fire(this, "wakeup");
        return customEvent.fire(this, "statusChanged", {
          status: status
        });
      },
      blur: function(callback) {
        if (typeof callback === "function") {
          return this.on("blur", callback);
        }
        status = "hidden";
        customEvent.fire(this, "blur");
        customEvent.fire(this, "idle");
        return customEvent.fire(this, "statusChanged", {
          status: status
        });
      },
      idle: function(callback) {
        if (typeof callback === "function") {
          return this.on("idle", callback);
        }
        status = "idle";
        customEvent.fire(this, "idle");
        return customEvent.fire(this, "statusChanged", {
          status: status
        });
      },
      wakeup: function(callback) {
        if (typeof callback === "function") {
          return this.on("wakeup", callback);
        }
        status = "active";
        customEvent.fire(this, "wakeup");
        return customEvent.fire(this, "statusChanged", {
          status: status
        });
      },
      on: function(name, callback) {
        init();
        return customEvent.add(this, name, callback);
      },
      off: function(name, callback) {
        init();
        return customEvent.remove(this, name, callback);
      },
      onEvery: function(seconds, callback) {
        var paused, t;
        init();
        paused = false;
        if (callback) {
          t = setInterval(function() {
            if (status === "active" && paused === false) {
              return callback();
            }
          }, seconds * 1000);
        }
        return {
          stop: function() {
            return clearInterval(t);
          },
          pause: function() {
            return paused = true;
          },
          resume: function() {
            return paused = false;
          },
          code: t,
          callback: callback
        };
      },
      now: function(check) {
        init();
        return status === (check || "active");
      }
    };
    return ifvisible;
  });

}).call(this);
; (function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('WebSdkCore', [], factory);
    } else {
        window.WebSdkCore = factory();
    }
})(function () {
    var WebSdk = {
        Promise: null,      // allows passing custom implementation of promises,
        debug: false,       // if true browser console will be used to output debug messages
        version: 4
    };

    var WebSdkEncryptionSupport = {
        None: 1,
        Encoding: 2,
        Encryption: 3,
        AESEncryption: 4
    };

    var WebSdkDataSupport = {
        Binary: 1,
        String: 2
    };

    var core = {
        WebSdk: WebSdk,
        WebSdkEncryptionSupport: WebSdkEncryptionSupport,
        WebSdkDataSupport: WebSdkDataSupport
    };

    core.log = function () {
        if (!core.WebSdk.debug) return;

        if (console.log.apply)
            console.log.apply(console, [].slice.call(arguments));
        else
            console.log(arguments[0]);
    }

    return core;
});
;
(function(factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('WebSdkCore.utils', [
            'WebSdkCore'
        ], factory);
    } else {
        if (!window.WebSdkCore)
            throw new Error("WebSdkCore is not loaded.");

      window.WebSdkCore.utils = factory(window.WebSdkCore);
    }
})(function (core) {

    function getQueryParam(url, name) {
        var match = RegExp('[?&]' + name + '=([^&]*)').exec(url);
        return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
    }

    function ajax(method, url, data) {
        var promise = new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.responseType = "json";
            xhr.setRequestHeader("Accept", "application/json");
            xhr.onreadystatechange = function onreadystatechange() {
                if (this.readyState === XMLHttpRequest.DONE) {
                    if (this.status === 200) {
                        var data;
                        if (this.responseType === '' && typeof this.responseText === "string")
                            data = JSON.parse(this.responseText);
                        else
                            data = this.response;
                        resolve(data);
                    } else {
                        reject(this);
                    }
                }
            };

            if (method.toLowerCase() === "post" && data) {
                var urlEncodedData = "";
                var urlEncodedDataPairs = [];
                var name;
                for (name in data) {
                    urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
                }
                urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');
                xhr.send(urlEncodedData);
            } else {
                xhr.send();
            }
        });

        return promise;
    }

    function defer(deferred) {
        deferred.promise = new Promise(function (resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return deferred;
    }

    function Deferred() {
        if (this instanceof Deferred) return defer(this);
        else return defer(Object.create(Deferred.prototype));
    }

    function tryParseJson(str) {
        if (!str)
            return null;

        var obj;
        try {
            obj = JSON.parse(str);
        } catch (e) {
            obj = null;
        }
        return obj;
    }

    var FixedQueue = (function () {
        function FixedQueue(maxSize) {
            this.m_items = [];
            this.m_maxSize = maxSize;
        }

        Object.defineProperty(FixedQueue.prototype, "length", {
            get: function () {
                return this.m_items.length;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(FixedQueue.prototype, "items", {
            get: function () {
                return this.m_items;
            },
            enumerable: true,
            configurable: true
        });

        FixedQueue.prototype.trimHead = function () {
            if (this.m_items.length <= this.m_maxSize)
                return;
            Array.prototype.splice.call(this.m_items, 0, this.m_items.length - this.m_maxSize);
        };

        FixedQueue.prototype.trimTail = function () {
            if (this.m_items.length <= this.m_maxSize)
                return;
            Array.prototype.splice.call(this.m_items, this.m_maxSize, this.m_items.length - this.m_maxSize);
        };

        FixedQueue.prototype.push = function () {
            var result = Array.prototype.push.apply(this.m_items, arguments);
            this.trimHead();
            return result;
        };

        FixedQueue.prototype.splice = function () {

            var result = Array.prototype.splice.apply(this.m_items, arguments);
            this.trimTail();
            return result;
        };

        FixedQueue.prototype.unshift = function () {

            var result = Array.prototype.unshift.apply(this.m_items, arguments);
            this.trimTail();
            return result;
        };
        return FixedQueue;
    })();

    return {
        getQueryParam: getQueryParam,
        ajax: ajax,
        tryParseJson: tryParseJson,

        Deferred: Deferred,
        FixedQueue: FixedQueue
    };
});
;(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('WebSdkCore.configurator', [
            'WebSdkCore',
            'WebSdkCore.utils'
        ], factory);
    } else {
        if (!window.WebSdkCore)
            throw new Error("WebSdkCore is not loaded.");

        window.WebSdkCore.configurator = factory(window.WebSdkCore, window.WebSdkCore.utils);
    }
})(function (core, utils) {

    /**
    * Loads configuration parameters from configuration server and saves it in session storage.
    */
    function Configurator() {
        this.m_key = "websdk";

        var sessionData = utils.tryParseJson(sessionStorage.getItem(this.m_key));
        if (sessionData) {
            this.m_port = parseInt(sessionData.port);
            this.m_host = sessionData.host || "127.0.0.1";
            this.m_isSecure = sessionData.isSecure;
            this.m_srp = sessionData.srp;
        }
    }

    Object.defineProperty(Configurator.prototype, "url", {
        get: function () {
            if (!this.m_port || !this.m_host) return null;

            var protocol = this.m_isSecure ? "https" : "http";
            return protocol + "://" + this.m_host + ":" + this.m_port.toString();
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Configurator.prototype, "srp", {
        get: function () {
            return this.m_srp;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Configurator.prototype, "sessionId", {
        get: function () {
            return sessionStorage.getItem("websdk.sessionId");
        },
        set: function (value) {
            return sessionStorage.setItem("websdk.sessionId", value);
        },
        enumerable: true,
        configurable: true
    });

    Configurator.prototype.ensureLoaded = function (callback) {
        core.log("Configurator: ensureLoaded");

        if (!!this.url && !!this.srp) return callback(null);

        var self = this,
            uri = "https://127.0.0.1:52181/get_connection";

        utils.ajax('get', uri)
            .then(function (response) {
                core.log("Configurator: findConfiguration -> ", response);
                if (response && response.endpoint && self.tryParse(response.endpoint)) {
                    callback(null);
                } else {
                    callback(new Error("Cannot load configuration"));
                }
            })
            .catch(function (err) {
                core.log("Configurator: findConfiguration -> ERROR ", err);
                callback(err);
            });
    };

    Configurator.prototype.tryParse = function (connectionString) {
        core.log("Configurator: tryParse " + connectionString);

        var urlEl = document.createElement("a");
        urlEl.href = connectionString;

        var port = parseInt(utils.getQueryParam(urlEl.search, "web_sdk_port") || ""),
            isSecure = utils.getQueryParam(urlEl.search, "web_sdk_secure") == "true",
            host = urlEl.hostname;

        var p1 = utils.getQueryParam(urlEl.search, "web_sdk_username"),
            p2 = utils.getQueryParam(urlEl.search, "web_sdk_password"),
            salt = utils.getQueryParam(urlEl.search, "web_sdk_salt");

        if (!port || !host || !p1 || !p2 || !salt) return false;

        this.m_port = port;
        this.m_host = host;
        this.m_isSecure = isSecure;
        this.m_srp = {
            p1: p1,
            p2: p2,
            salt: salt
        };

        sessionStorage.setItem(this.m_key, JSON.stringify({
            port: this.m_port,
            host: this.m_host,
            isSecure: this.m_isSecure,
            srp: this.m_srp
        }));

        return true;
    };

    return new Configurator();
});
; (function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('WebSdkCore.cipher', [
            'WebSdkCore'
        ], factory);
    } else {
        if (!window.WebSdkCore)
            throw new Error("WebSdkCore is not loaded.");

        window.WebSdkCore.cipher = factory(window.WebSdkCore);
    }
})(function (core) {

    var WebSdkAESVersion = 1;

    var WebSdkAESDataType = {
        Binary: 1,
        UnicodeString: 2,
        UTF8String: 3
    };

    var crypt = window.crypto || window.msCrypto;

    function utf8ToBase64(str) {
        var binstr = utf8ToBinaryString(str);
        return btoa(binstr);
    }

    function base64ToUtf8(b64) {
        var binstr = atob(b64);

        return binaryStringToUtf8(binstr);
    }

    function utf8ToBinaryString(str) {
        var escstr = encodeURIComponent(str);
        var binstr = escstr.replace(/%([0-9A-F]{2})/g, function (match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        });

        return binstr;
    }

    function binaryStringToUtf8(binstr) {
        var escstr = binstr.replace(/(.)/g, function (m, p) {
            var code = p.charCodeAt(0).toString(16).toUpperCase();
            if (code.length < 2) {
                code = '0' + code;
            }
            return '%' + code;
        });

        return decodeURIComponent(escstr);
    }

    function keyCharAt(key, i) {
        return key.charCodeAt(Math.floor(i % key.length));
    }

    function xor(key, data) {
        var strArr = Array.prototype.map.call(data, function (x) { return x });
        return strArr.map(function (c, i) {
            return String.fromCharCode(c.charCodeAt(0) ^ keyCharAt(key, i));
        }).join("");
    }

    function getHdr(buf) {
        var dv = new DataView(buf);
        var version = dv.getUint8(0);
        var type = dv.getUint8(1);
        var length = dv.getUint32(2, true);
        var offset = dv.getUint16(6, true);
        return { version: version, type: type, length: length, offset: offset };
    }

    function setHdr(buf, type)
    {
        var dv = new DataView(buf);
        // set version
        dv.setUint8(0, WebSdkAESVersion);
        // set type
        dv.setUint8(1, type);
        // set length
        dv.setUint32(2, buf.byteLength - 8, true);
        // set offset
        dv.setUint16(6, 8, true);
    }

    function ab2str(buf) {

        return new Promise(function (resolve, reject) {
            var blob = new Blob([new Uint8Array(buf)]);
            var fileReader = new FileReader();
            fileReader.onload = function (event) {
                return resolve(event.target.result);
            };
            fileReader.onerror = function (event) {
                return reject(event.target.error);
            };
            fileReader.readAsText(blob, 'utf-16');
        });
    }
    function str2ab(str) {
        var buf = new ArrayBuffer(str.length * 2 + 8); // 2 bytes for each char
        setHdr(buf, WebSdkAESDataType.UnicodeString); // unicode string
        var bufView = new Uint16Array(buf, 8);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }
    function binary2ab(bin) {
        var buf = new ArrayBuffer(bin.length + 8); 
        setHdr(buf, WebSdkAESDataType.Binary); // binary string
        var bufSrc = new Uint8Array(bin);
        var bufDest = new Uint8Array(buf, 8);
        bufDest.set(bufSrc);
        return buf;
    }

    // AES encryption wrappers
    // So far we will use AES-CBC 256bit encryption with 128bit IV vector.

    // You can use crypto.generateKey or crypto.importKey,
    // but since I'm always either going to share, store, or receive a key
    // I don't see the point of using 'generateKey' directly
    function generateKey(rawKey) {
        var usages = ['encrypt', 'decrypt'];
        var extractable = false;

        return crypt.subtle.importKey(
          'raw'
        , rawKey
        , { name: 'AES-CBC' }
        , extractable
        , usages
        );
    }

    function encrypt(data, key, iv) {
        // a public value that should be generated for changes each time
        return crypt.subtle.encrypt(
          { name: 'AES-CBC', iv: iv }
        , key
        , data
        );
    };

    function decrypt(data, key, iv) {
        // a public value that should be generated for changes each time
        return crypt.subtle.decrypt(
          { name: 'AES-CBC', iv: iv }
        , key
        , data
        );
    };

    function msGenerateKey(rawKey) {
        var usages = ['encrypt', 'decrypt'];
        var extractable = false;
        return new Promise(function (resolve, reject) {

            var keyOpp = crypt.subtle.importKey(
              'raw'
            , rawKey
            , { name: 'AES-CBC' }
            , extractable
            , usages
            );
            keyOpp.oncomplete = function (e) {
                resolve(keyOpp.result);
            }

            keyOpp.onerror = function (e) {
                reject(new Error("Cannot create a key..."));
            }

        });
    }

    function msEncrypt(data, key, iv) {
        return new Promise(function (resolve, reject) {
            // a public value that should be generated for changes each time
            var encOpp = crypt.subtle.encrypt(
              { name: 'AES-CBC', iv: iv }
            , key
            , data
            );
            encOpp.oncomplete = function (e) {
                resolve(encOpp.result);
            };
            encOpp.onerror = function (e) {
                reject(new Error("Fail to encrypt data..."));
            }
        });
    }

    function msDecrypt(data, key, iv) {
        return new Promise(function (resolve, reject) {
            // a public value that should be generated for changes each time
            var decOpp = crypt.subtle.decrypt(
              { name: 'AES-CBC', iv: iv }
            , key
            , data
            );
            decOpp.oncomplete = function (e) {
                resolve(decOpp.result);
            };
            decOpp.onerror = function (e) {
                reject(new Error("Fail to encrypt data..."));
            }
        });
    }

    function encryptAES(data, key, iv) {
        if (typeof window.crypto !== 'undefined') {
            return generateKey(key).then(function (key) {
                return encrypt(data, key, iv);
            });
        } else { // Microsoft IE
            return msGenerateKey(key).then(function (key) {
                return msEncrypt(data, key, iv);
            });
        }
    };

    function decryptAES(data, key, iv) {
        if (typeof window.crypto !== 'undefined') {
            return generateKey(key).then(function (key) {
                return decrypt(data, key, iv);
            });
        } else {
            return msGenerateKey(key).then(function (key) {
                return msDecrypt(data, key, iv);
            });
        }
    };

    /////////////////////////////////////////////

    function hexToArray(hex) {
        if (hex.length % 2 === 1) throw new Error("hexToBytes can't have a string with an odd number of characters.");
        if (hex.indexOf("0x") === 0) hex = hex.slice(2);
        return new Uint8Array(hex.match(/../g).map(function (x) { return parseInt(x, 16) }));
    };

    function promisefy(data) {
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                resolve(data);
            });
        });
    }

    function AESEncryption(key, M1, data) {
        var iv = new Uint8Array(hexToArray(M1).buffer, 0, 16);
        var buff;
        if (typeof data === 'string')
            buff = str2ab(data);
        else
            buff = binary2ab(data);
        return encryptAES(buff, key, iv);
    }
    function AESDecryption(key, M1, data) {
        var iv = new Uint8Array(hexToArray(M1).buffer, 0, 16);
        return decryptAES(data, key, iv).then(function (data) {
            var hdr = getHdr(data);
            if (hdr.version !== WebSdkAESVersion)
                throw new Error("Invalid data version!");
            switch (hdr.type) {
                case WebSdkAESDataType.Binary:
                    return data.slice(hdr.offset);
                case WebSdkAESDataType.UnicodeString:
                    return ab2str(data.slice(hdr.offset));
                default:
                    throw new Error("Invalid data type!");
            }
            return ab2str(data);
        });
    }

    return {
        encode: function (key, M1, data) {
            switch (core.WebSdk.version) {
                case core.WebSdkEncryptionSupport.AESEncryption:
                    return AESEncryption(key, M1, data);
                case core.WebSdkEncryptionSupport.Encryption:
                    return promisefy(utf8ToBase64(xor(M1, data)));
                case core.WebSdkEncryptionSupport.Encoding:
                    return promisefy(utf8ToBase64(data));
                default:
                    return promisefy(data);
            }
        },
        decode: function (key, M1, data) {
            switch (core.WebSdk.version) {
                case core.WebSdkEncryptionSupport.AESEncryption:
                    return AESDecryption(key, M1, data);
                case core.WebSdkEncryptionSupport.Encryption:
                    return promisefy(xor(M1, base64ToUtf8(data)));
                case core.WebSdkEncryptionSupport.Encoding:
                    return promisefy(base64ToUtf8(data));
                default:
                    return promisefy(data);
            }
        },
        isCryptoSupported: function () {
            return ((typeof crypt !== 'undefined') && crypt.subtle && crypt.subtle.importKey && crypt.subtle.encrypt);
        },
        hexToBytes: function(hex) {
            return hexToArray(hex);
        }
    };
});
; (function (factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define('WebSdkCore.channelOptions', [
            'WebSdkCore'
        ], factory);
    } else {
        var core = window.WebSdkCore;
        if (!core)
            throw new Error("WebSdkCore is not loaded.");

        window.WebSdkCore.channelOptions = factory(core);
    }
})(function (core) {

    function WebChannelOptions(options) {
        if (!options) options = {};

        var version = core.WebSdkEncryptionSupport.AESEncryption,
            debug = options.debug === true;

        if (!!options.version) {
            validateVersion(options.version);
            version = options.version;
        }

        Object.defineProperties(this, {
            "version": {
                get: function () { return version; },
                set: function (value) {
                    validateVersion(value);
                    version = value;
                },
                enumerable: true
            },
            "debug": {
                get: function () { return debug; },
                set: function () { debug = value; },
                enumerable: true
            }
        });

        function validateVersion(v) {
            for (var supportedVersion in core.WebSdkEncryptionSupport) {
                if (core.WebSdkEncryptionSupport.hasOwnProperty(supportedVersion) &&
                    core.WebSdkEncryptionSupport[supportedVersion] === v)
                    return;
            }
            throw new Error("invalid WebSdk version requested");
        }
    }
    return WebChannelOptions;
 
});

; (function (factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define('WebSdkCore.channelClientImplementation', [
            'async',
            'sjcl',
            'BigInteger',
            'SRPClient',
            'WebSdkCore',
            'WebSdkCore.utils',
            'WebSdkCore.configurator',
            'WebSdkCore.cipher'
        ], factory);
    } else {
        var core = window.WebSdkCore;
        if (!core)
            throw new Error("WebSdkCore is not loaded.");

        window.WebSdkCore.channelClientImplementation = factory(async, sjcl, BigInteger, SRPClient, core, core.utils, core.configurator, core.cipher);
    }
})(function (async, sjcl, BigInteger, SRPClient, core, utils, configurator, cipher) {


    function WebChannelClientImpl(clientPath) {

        if (!clientPath)
            throw new Error("clientPath cannot be empty");

        core.log("WebSdkVersion: ", core.WebSdk.version, "clientPath: ", clientPath);

        this.clientPath = clientPath;

        this.wsThreshold = 10240; // max number of buffered bytes (10k)
        this.wsQueueInterval = 1000; // interval to process message queue and send data over web-socket if buffer size is less then the threshold
        this.wsQueueLimit = 100; // maximum queue size, when reaching this limit the oldest messages will be removed from the queue.
        this.wsReconnectInterval = 5000;

        this.queue = new utils.FixedQueue(this.wsQueueLimit);
        this.queueInterval = null;
        this.webSocket = null;

        this.sessionKey = null;
        this.M1 = null;

        this.reconnectTimer = null;

        this.onConnectionFailed = null;
        this.onConnectionSucceed = null;
        this.onDataReceivedBin = null;
        this.onDataReceivedTxt = null;

        var self = this;

        try {
            window.parent.parent.addEventListener("blur", function () {
                self.resetReconnectTimer();
                self.notifyFocusChanged(false);
            });
            window.parent.parent.addEventListener("focus", function () {
                self.notifyFocusChanged(true);
            });
        } catch (err) {

        }

    }

    WebChannelClientImpl.prototype.notifyFocusChanged = function(isFocused) {
        if (!this.isConnected()) return;

        core.log('WebChannelClientImpl: notifyFocusChanged ->', isFocused);

        var data = {
            type: 'sdk.focusChanged',
            data: isFocused
        }

        this.sendData(JSON.stringify(data));
    }
    WebChannelClientImpl.prototype.fireConnectionFailed = function() {
        //if (window.parent.parent.document.hasFocus()) {
            this.setReconnectTimer();
        //}

        if (this.onConnectionFailed) {
            this.onConnectionFailed();
        }
    };

    WebChannelClientImpl.prototype.fireConnectionSucceed = function() {
        if (this.onConnectionSucceed) {
            this.onConnectionSucceed();
        }
    };

    WebChannelClientImpl.prototype.resetReconnectTimer = function() {
        if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    WebChannelClientImpl.prototype.setReconnectTimer = function() {
        this.resetReconnectTimer();

        var self = this;
        this.reconnectTimer = setInterval(function() {
            self.connectInternal(false);
        }, this.wsReconnectInterval);
    }

    /**
    * Connects to web socket server and setups all event listeners
    */
    WebChannelClientImpl.prototype.wsconnect = function(url) {
        core.log("WebChannelClientImpl: wsconnect " + url);
        var self = this;

        var $q = utils.Deferred();
        if (this.webSocket && this.webSocket.readyState !== WebSocket.CLOSED)
            throw new Error("wsdisconnect has not been called");

        this.webSocket = new WebSocket(url);
        // we need binary type 'arraybuffer' because default type 'blob' is not working
        this.webSocket.binaryType = 'arraybuffer';


        this.webSocket.onclose = function(event) {
            core.log("WebChannelClientImpl: wsonclose");
            return self.wsonclose(true);
        };
        this.webSocket.onopen = function(event) {
            core.log("WebChannelClientImpl: wsonopen");
            $q.resolve();
            try {
                if (window.parent.parent.document.hasFocus()) {
                    self.notifyFocusChanged(true);
                } else {
                    self.notifyFocusChanged(false);
                }
            } catch (err) {
                self.notifyFocusChanged(true);
            }
        };
        this.webSocket.onerror = function(event) {
            core.log("WebChannelClientImpl: wsonerror " + arguments);
            return $q.reject(new Error("WebSocket connection failed."));
        };
        this.webSocket.onmessage = function(event) {
            return self.wsonmessage(event);
        };

        return $q.promise;
    };

    /**
    * Closes web socket connection and cleans up all event listeners
    */
    WebChannelClientImpl.prototype.wsdisconnect = function() {
        var self = this;
        var $q = utils.Deferred();

        if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
            $q.resolve();
        } else {
            this.webSocket.onclose = function(event) {
                self.wsonclose(false);
                $q.resolve();
            };
            this.webSocket.close();
        }

        return $q.promise;
    };

    WebChannelClientImpl.prototype.wsonclose = function(isFailed) {
        core.log("WebChannelClientImpl: connection closed");

        this.webSocket.onclose = null;
        this.webSocket.onopen = null;
        this.webSocket.onmessage = null;
        this.webSocket.onerror = null;

        this.deactivateBufferCheck();

        if (isFailed) {
            this.fireConnectionFailed();
        }
    };

    WebChannelClientImpl.prototype.wsonmessage = function(event) {
        var self = this;
        cipher.decode(this.sessionKey, this.M1, event.data).then(function (data) {
            if (typeof data === 'string') {
                if (self.onDataReceivedTxt) {
                    self.onDataReceivedTxt(data);
                }
            } else {
                if (self.onDataReceivedBin) {
                    self.onDataReceivedBin(data);
                }
            }
        });
    };

    /**
    * Sends data over web socket
    */
    WebChannelClientImpl.prototype.wssend = function(data) {
        if (!this.isConnected())
            return false;

        if (this.webSocket.bufferedAmount >= this.wsThreshold) {
            this.activateBufferCheck();
            return false;
        }

        this.webSocket.send(data);
        return true;
    };

    WebChannelClientImpl.prototype.generateSessionKey = function(callback) {
        var srpData = configurator.srp;
        if (!srpData.p1 || !srpData.p2 || !srpData.salt)
            return callback(new Error("No data available for authentication"));

        var self = this;

        var srp = new SRPClient(srpData.p1, srpData.p2);
        var a;
        do {
            a = srp.srpRandom();
        } while (!srp.canCalculateA(a));

        var A = srp.calculateA(a);

        if (core.WebSdk.version >= core.WebSdkEncryptionSupport.AESEncryption && !cipher.isCryptoSupported())
            core.WebSdk.version = core.WebSdkEncryptionSupport.Encryption; // if AES encryption is not supported by Browser, set data encryption to old one.

        utils.ajax('post', configurator.url + '/connect', {
            username: srpData.p1,
            A: srp.toHexString(A),
            version: core.WebSdk.version.toString()
        }).then(function (response) {

            if (response.version === undefined) // old client
                core.WebSdk.version = Math.min(core.WebSdk.version, core.WebSdkEncryptionSupport.Encryption);
            else core.WebSdk.version = response.version;

            var B = new BigInteger(response.B, 16),
                u = srp.calculateU(A, B),
                S = srp.calculateS(B, srpData.salt, u, a),
                K = srp.calculateK(S),
                M1 = srp.calculateM(A, B, K, srpData.salt);

            // we will use SHA256 from K as AES 256bit session key
            self.sessionKey = cipher.hexToBytes(sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(sjcl.codec.hex.toBits(K))));
            self.M1 = M1;

            callback(null, M1);
        }).catch(callback);
    }

    /**
    * Sets up connection with parameters from configurator (generates session key and connects to websocket server).
    */
    WebChannelClientImpl.prototype.setupSecureChannel = function(callback) {
        core.log('WebChannelClientImpl.setupSecureChannel');

        var self = this;
        async.waterfall([
            function(callback) {
                self.generateSessionKey(callback);
            },
            function(sessionKey, callback) {
               // self.sessionKey = sessionKey;

                var connectionUrl = configurator.url.replace('http', 'ws') +
                    '/' + self.clientPath +
                    '?username=' + configurator.srp.p1 +
                    '&M1=' + self.M1;

                //adding sessionId to url
                if (!configurator.sessionId) {
                    configurator.sessionId = sjcl.codec.hex.fromBits(sjcl.random.randomWords(2, 0));
                }
                connectionUrl += "&sessionId=" + configurator.sessionId;

                //adding version to url
                connectionUrl += "&version=" + core.WebSdk.version.toString();

                self.wsconnect(connectionUrl)
                    .then(function() {
                        callback(null);
                    })
                    .catch(function(err) {
                        core.log(err);
                        callback(err);
                    });
            }
        ], callback);
    };

    /**
    * @result {boolean} True if web socket is ready for transferring data
    */
    WebChannelClientImpl.prototype.isConnected = function() {
        return !!this.webSocket && this.webSocket.readyState === WebSocket.OPEN;
    };

    /**
    * Sends message if channel is ready
    * Otherwise, adds message to the queue.
    */
    WebChannelClientImpl.prototype.sendData = function(data) {
        if (!this.wssend(data)) {
            this.queue.push(data);
        }
    };
    WebChannelClientImpl.prototype.deactivateBufferCheck = function() {
        if (!this.queueInterval) return;

        clearInterval(this.queueInterval);
        this.queueInterval = null;
    };

    WebChannelClientImpl.prototype.activateBufferCheck = function() {
        if (this.queueInterval) return;

        var self = this;
        this.queueInterval = setInterval(function() {
            self.processMessageQueue();

            if (self.queue.length === 0) {
                self.deactivateBufferCheck();
            }
        }, this.wsQueueInterval);
    }

    /**
    * Sends messages from a queue if any. Initiates secure connection if needed and has not been yet initiated.
    */
    WebChannelClientImpl.prototype.processMessageQueue = function() {
        core.log("WebChannelClientImpl: processMessageQueue " + this.queue.length);
        if (this.queue.length === 0)
            return;

        for (var i = 0; i < this.queue.length;) {
            if (!this.wssend(this.queue.items[i])) break;
            this.queue.splice(i, 1);
        }
    };

    WebChannelClientImpl.prototype.connectInternal = function(multipleAttempts) {
        core.log('WebChannelClientImpl.connectInternal');

        this.resetReconnectTimer();

        var self = this;
        async.waterfall([
            function(callback) {
                configurator.ensureLoaded(callback);
            },
            function(callback) {
                async.retry(multipleAttempts ? 3 : 1, function() {
                    self.setupSecureChannel(callback);
                }, callback);
            }
        ], function(err) {
            if (err) return self.fireConnectionFailed();

            self.fireConnectionSucceed();
            self.processMessageQueue();
        });
    };

    WebChannelClientImpl.prototype.connect = function() {
        this.connectInternal(true);
    };

    WebChannelClientImpl.prototype.disconnect = function() {
        this.wsdisconnect();
    };

    WebChannelClientImpl.prototype.sendDataBin = function (data) {
        var self = this;
        cipher.encode(this.sessionKey, this.M1, data).then(function (data) {
            self.sendData(data);
        });
    };

    WebChannelClientImpl.prototype.sendDataTxt = function(data) {
        var self = this;
        cipher.encode(this.sessionKey, this.M1, data).then(function (data) {
            self.sendData(data);
        });
    };

    return WebChannelClientImpl;
});

; (function (factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		define('WebSdkCore.channelClient', [
            'WebSdkCore',
            'WebSdkCore.channelOptions',
            'WebSdkCore.channelClientImplementation'
		], factory);
	} else {
		var core = window.WebSdkCore;
		if (!core)
			throw new Error("WebSdkCore is not loaded.");

		window.WebSdkCore.channelClient = factory(core, core.channelOptions, core.channelClientImplementation);
    }
})(function (core, WebChannelOptions, WebChannelClientImpl) {

    function WebChannelClient(clientPath, options) {
        if (options) {
            core.log(options);

            var webChannelOptions = new WebChannelOptions(options);

            core.WebSdk.debug = webChannelOptions.debug;
            core.WebSdk.version = webChannelOptions.version;
        }

        var client = new WebChannelClientImpl(clientPath);

        Object.defineProperties(this, {
            "path": {
                get: function () { return clientPath; },
                enumerable: true
            },
            "onConnectionFailed": {
                get: function () { return client.onConnectionFailed; },
                set: function (value) { client.onConnectionFailed = value; },
                enumerable: true
            },
            "onConnectionSucceed": {
                get: function () { return client.onConnectionSucceed; },
                set: function (value) { client.onConnectionSucceed = value; },
                enumerable: true
            },
            "onDataReceivedBin": {
                get: function () { return client.onDataReceivedBin; },
                set: function (value) { client.onDataReceivedBin = value; },
                enumerable: true
            },
            "onDataReceivedTxt": {
                get: function () { return client.onDataReceivedTxt; },
                set: function (value) { client.onDataReceivedTxt = value; },
                enumerable: true
            }
        });

        this.connect = function () {
            client.connect();
        }

        this.disconnect = function () {
            client.disconnect();
        }

        this.isConnected = function () {
            return client.isConnected();
        }

        this.sendDataBin = function (data) {
            client.sendDataBin(data);
        }

        this.sendDataTxt = function (data) {
            client.sendDataTxt(data);
        }

        this.resetReconnectTimer = function () {
            client.resetReconnectTimer();
        }
    }

    return WebChannelClient;
});

; (function (factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define('WebSdk', [
            'WebSdkCore',
            'WebSdkCore.channelOptions',
            'WebSdkCore.channelClient',
            'ifvisible'
        ], factory);
    } else {
        var core = window.WebSdkCore;
        if (!core)
            throw new Error("WebSdkCore is not loaded.");

        window.WebSdk = factory(core, core.channelOptions, core.channelClient, ifvisible);
    }
})(function (core, WebChannelOptions, WebChannelClient, ifvisible) {
    core.log('loaded websdk.client.ui');

    core.visibilityApi = ifvisible;

    return {
        WebChannelOptions: WebChannelOptions,
        WebChannelClient: WebChannelClient
    };
});
;!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("@digitalpersona/core"),require("WebSdk")):"function"==typeof define&&define.amd?define(["exports","@digitalpersona/core","WebSdk"],t):t(((e=e||self).dp=e.dp||{},e.dp.devices=e.dp.devices||{}),e.dp.core)}(this,function(e,t){"use strict";class n{constructor(e){this.type=e}}class r extends n{constructor(){super("CommunicationFailed")}}class s extends n{constructor(e,t){super(e),this.deviceId=t}}class o extends s{constructor(e){super("DeviceConnected",e)}}class i extends s{constructor(e){super("DeviceDisconnected",e)}}var a,c,d,h,u,l,p,m,f,C,w,D,S,N;(a=e.CardType||(e.CardType={}))[a.Contact=1]="Contact",a[a.Contactless=2]="Contactless",a[a.Proximity=4]="Proximity",(c=e.CardAttributes||(e.CardAttributes={}))[c.SupportsPIN=1]="SupportsPIN",c[c.SupportsUID=2]="SupportsUID",c[c.IsPKI=65536]="IsPKI",c[c.IsPIV=131072]="IsPIV",c[c.IsReadOnly=2147483648]="IsReadOnly";class v extends s{constructor(e,t){super("CardInserted",e),this.cardId=t}}class U extends s{constructor(e,t){super("CardRemoved",e),this.cardId=t}}class T{constructor(){this.handlers={}}_on(e,t){return this.handlers[e]=this.handlers[e]||[],this.handlers[e].push(t),t}_off(e,t){if(e){const n=this.handlers[e];n&&(t?this.handlers[e]=n.filter(e=>e!==t):delete this.handlers[e])}else this.handlers={};return this}emit(e){if(!e)return;const t=e.type,n=this["on"+t];n&&this.invoke(n,e);const r=this.handlers[t];r&&r.forEach(t=>this.invoke(t,e))}invoke(e,t){try{e(t)}catch(e){console.error(e)}}}!function(e){e[e.Response=0]="Response",e[e.Notification=1]="Notification"}(d||(d={}));class g{constructor(e,t){this.pending=[],this.webChannel=new WebSdk.WebChannelClient(e,t),this.webChannel.onConnectionSucceed=this.onConnectionSucceed.bind(this),this.webChannel.onConnectionFailed=this.onConnectionFailed.bind(this),this.webChannel.onDataReceivedTxt=this.onDataReceivedTxt.bind(this)}send(e,t){const n=new Promise((n,r)=>{e.resolve=n,e.reject=r,t&&(e.timer=window.setTimeout(()=>{if(e.timer)try{e.reject(new Error("Timeout"))}catch(e){}},t))});return this.pending.push(e),this.webChannel.isConnected()?this.processRequestQueue():this.webChannel.connect(),n}onConnectionSucceed(){this.processRequestQueue()}onConnectionFailed(){if(this.pending.forEach(e=>e.reject(new Error("Communication failure."))),this.pending=[],this.onCommunicationError)try{this.onCommunicationError()}catch(e){}}onDataReceivedTxt(e){const n=JSON.parse(t.Utf8.fromBase64Url(e));if(n.Type===d.Response){const e=JSON.parse(t.Utf8.fromBase64Url(n.Data||"")),r=this.findRequest(e);if(null!==r){r.timer&&(window.clearTimeout(r.timer),delete r.timer);const t=e.Result>>>0;t>2147483647?r.reject(new Error(`0x${t.toString(16)}`)):r.resolve(e)}else console.log(`Orphaned response: ${n.Type}`)}else if(n.Type===d.Notification){const e=JSON.parse(t.Utf8.fromBase64Url(n.Data||""));if(this.onNotification)try{this.onNotification(e)}catch(e){}}else console.log(`Unknown message type: ${n.Type}`)}processRequestQueue(){this.pending.forEach((e,n,r)=>{e.sent||(this.webChannel.sendDataTxt(t.Base64Url.fromJSON(e.command)),r[n].sent=!0)})}findRequest(e){for(let t=0;t<this.pending.length;t++){const n=this.pending[t];if(n.sent&&n.command.Method===e.Method)return this.pending.splice(t,1),n}return null}}class R{constructor(e,t){this.Method=e,this.Parameters=t}}class I{constructor(e){this.command=e,this.sent=!1}}!function(e){e[e.EnumerateReaders=1]="EnumerateReaders",e[e.EnumerateCards=2]="EnumerateCards",e[e.GetCardInfo=3]="GetCardInfo",e[e.GetCardUID=4]="GetCardUID",e[e.GetDPCardAuthData=5]="GetDPCardAuthData",e[e.GetDPCardEnrollData=6]="GetDPCardEnrollData",e[e.Subscribe=100]="Subscribe",e[e.Unsubscribe=101]="Unsubscribe"}(h||(h={})),function(e){e[e.ReaderConnected=1]="ReaderConnected",e[e.ReaderDisconnected=2]="ReaderDisconnected",e[e.CardInserted=3]="CardInserted",e[e.CardRemoved=4]="CardRemoved"}(u||(u={}));(l=e.DeviceUidType||(e.DeviceUidType={}))[l.Persistent=0]="Persistent",l[l.Volatile=1]="Volatile",(p=e.DeviceModality||(e.DeviceModality={}))[p.Unknown=0]="Unknown",p[p.Swipe=1]="Swipe",p[p.Area=2]="Area",p[p.AreaMultifinger=3]="AreaMultifinger",(m=e.DeviceTechnology||(e.DeviceTechnology={}))[m.Unknown=0]="Unknown",m[m.Optical=1]="Optical",m[m.Capacitive=2]="Capacitive",m[m.Thermal=3]="Thermal",m[m.Pressure=4]="Pressure",(f=e.SampleFormat||(e.SampleFormat={}))[f.Raw=1]="Raw",f[f.Intermediate=2]="Intermediate",f[f.Compressed=3]="Compressed",f[f.PngImage=5]="PngImage",(C=e.QualityCode||(e.QualityCode={}))[C.Good=0]="Good",C[C.NoImage=1]="NoImage",C[C.TooLight=2]="TooLight",C[C.TooDark=3]="TooDark",C[C.TooNoisy=4]="TooNoisy",C[C.LowContrast=5]="LowContrast",C[C.NotEnoughFeatures=6]="NotEnoughFeatures",C[C.NotCentered=7]="NotCentered",C[C.NotAFinger=8]="NotAFinger",C[C.TooHigh=9]="TooHigh",C[C.TooLow=10]="TooLow",C[C.TooLeft=11]="TooLeft",C[C.TooRight=12]="TooRight",C[C.TooStrange=13]="TooStrange",C[C.TooFast=14]="TooFast",C[C.TooSkewed=15]="TooSkewed",C[C.TooShort=16]="TooShort",C[C.TooSlow=17]="TooSlow",C[C.ReverseMotion=18]="ReverseMotion",C[C.PressureTooHard=19]="PressureTooHard",C[C.PressureTooLight=20]="PressureTooLight",C[C.WetFinger=21]="WetFinger",C[C.FakeFinger=22]="FakeFinger",C[C.TooSmall=23]="TooSmall",C[C.RotatedTooMuch=24]="RotatedTooMuch";class y extends s{constructor(e,t,n){super("SamplesAcquired",e),this.sampleFormat=t,this.samples=JSON.parse(n)}}class O extends s{constructor(e,t){super("QualityReported",e),this.quality=t}}class b extends s{constructor(e,t){super("ErrorOccurred",e),this.error=t}}class E extends s{constructor(e){super("AcquisitionStarted",e)}}class J extends s{constructor(e){super("AcquisitionStopped",e)}}!function(e){e[e.EnumerateDevices=1]="EnumerateDevices",e[e.GetDeviceInfo=2]="GetDeviceInfo",e[e.StartAcquisition=3]="StartAcquisition",e[e.StopAcquisition=4]="StopAcquisition"}(w||(w={})),function(e){e[e.Completed=0]="Completed",e[e.Error=1]="Error",e[e.Disconnected=2]="Disconnected",e[e.Connected=3]="Connected",e[e.Quality=4]="Quality",e[e.Stopped=10]="Stopped",e[e.Started=11]="Started"}(D||(D={}));!function(e){e[e.Init=1]="Init",e[e.Continue=2]="Continue",e[e.Term=3]="Term",e[e.Authenticate=4]="Authenticate"}(S||(S={})),function(e){e[e.Response=0]="Response",e[e.Notification=1]="Notification"}(N||(N={}));e.AcquisitionStarted=E,e.AcquisitionStopped=J,e.CardInserted=v,e.CardRemoved=U,e.CardsReader=class extends T{constructor(e){super(),this.channel=new g("smartcards",e),this.channel.onCommunicationError=this.onConnectionFailed.bind(this),this.channel.onNotification=this.processNotification.bind(this)}on(e,t){return this._on(e,t)}off(e,t){return this._off(e,t)}enumerateReaders(){return this.channel.send(new I(new R(h.EnumerateReaders))).then(e=>{const n=JSON.parse(t.Utf8.fromBase64Url(e.Data||"{}"));return JSON.parse(n.Readers||"[]")})}enumerateCards(){return this.channel.send(new I(new R(h.EnumerateCards))).then(e=>{const n=JSON.parse(t.Utf8.fromBase64Url(e.Data||"{}"));return JSON.parse(n.Cards||"[]").map(e=>JSON.parse(t.Utf16.fromBase64Url(e)))})}getCardInfo(e){return this.channel.send(new I(new R(h.GetCardInfo,t.Base64Url.fromJSON({Reader:e})))).then(e=>JSON.parse(t.Utf8.fromBase64Url(e.Data||"null")))}getCardUid(e){return this.channel.send(new I(new R(h.GetCardUID,t.Base64Url.fromJSON({Reader:e})))).then(e=>t.Base64.fromBase64Url(e.Data||""))}getCardAuthData(e,n){return this.channel.send(new I(new R(h.GetDPCardAuthData,t.Base64Url.fromJSON({Reader:e,PIN:n||""})))).then(e=>JSON.parse(t.Utf8.fromBase64Url(e.Data||"")))}getCardEnrollData(e,n){return this.channel.send(new I(new R(h.GetDPCardEnrollData,t.Base64Url.fromJSON({Reader:e,PIN:n||""})))).then(e=>JSON.parse(t.Utf8.fromBase64Url(e.Data||"")))}subscribe(e){return this.channel.send(new I(new R(h.Subscribe,e?t.Base64Url.fromJSON({Reader:e}):""))).then()}unsubscribe(e){return this.channel.send(new I(new R(h.Unsubscribe,e?t.Base64Url.fromJSON({Reader:e}):""))).then()}onConnectionFailed(){this.emit(new r)}processNotification(e){switch(e.Event){case u.ReaderConnected:return this.emit(new o(e.Reader));case u.ReaderDisconnected:return this.emit(new i(e.Reader));case u.CardInserted:return this.emit(new v(e.Reader,e.Card));case u.CardRemoved:return this.emit(new U(e.Reader,e.Card));default:console.log(`Unknown notification: ${e.Event}`)}}},e.CommunicationFailed=r,e.DeviceConnected=o,e.DeviceDisconnected=i,e.DeviceEvent=s,e.ErrorOccurred=b,e.Event=n,e.FingerprintReader=class extends T{constructor(e){super(),this.options=e,this.channel=new g("fingerprints",this.options),this.channel.onCommunicationError=this.onConnectionFailed.bind(this),this.channel.onNotification=this.processNotification.bind(this)}on(e,t){return this._on(e,t)}off(e,t){return this._off(e,t)}enumerateDevices(){return this.channel.send(new I(new R(w.EnumerateDevices))).then(e=>{if(!e)return[];const n=JSON.parse(t.Utf8.fromBase64Url(e.Data||"{}"));return JSON.parse(n.DeviceIDs||"[]")})}getDeviceInfo(e){return this.channel.send(new I(new R(w.GetDeviceInfo,t.Base64Url.fromJSON({DeviceID:e})))).then(e=>JSON.parse(t.Utf8.fromBase64Url(e.Data||"null")))}startAcquisition(e,n){return this.channel.send(new I(new R(w.StartAcquisition,t.Base64Url.fromJSON({DeviceID:n||"00000000-0000-0000-0000-000000000000",SampleType:e})))).then()}stopAcquisition(e){return this.channel.send(new I(new R(w.StopAcquisition,t.Base64Url.fromJSON({DeviceID:e||"00000000-0000-0000-0000-000000000000"})))).then()}onConnectionFailed(){this.emit(new r)}processNotification(e){switch(e.Event){case D.Completed:const n=JSON.parse(t.Utf8.fromBase64Url(e.Data||""));return this.emit(new y(e.Device,n.SampleFormat,n.Samples));case D.Error:const r=JSON.parse(t.Utf8.fromBase64Url(e.Data||""));return this.emit(new b(e.Device,r.uError));case D.Disconnected:return this.emit(new i(e.Device));case D.Connected:return this.emit(new o(e.Device));case D.Quality:const s=JSON.parse(t.Utf8.fromBase64Url(e.Data||""));return this.emit(new O(e.Device,s.Quality));case D.Stopped:return this.emit(new J(e.Device));case D.Started:return this.emit(new E(e.Device));default:console.log(`Unknown notification: ${e.Event}`)}}},e.QualityReported=O,e.SamplesAcquired=y,e.WindowsAuthClient=class extends T{constructor(e){super(),this.channel=new g("wia",e),this.channel.onCommunicationError=this.onConnectionFailed.bind(this)}on(e,t){return this._on(e,t)}off(e,t){return this._off(e,t)}init(){return this.channel.send(new I(new R(S.Init)),3e3).then(e=>{const t=JSON.parse(e.Data||"{}");return{handle:t.Handle,data:t.Data}})}continue(e,t){return this.channel.send(new I(new R(S.Continue,JSON.stringify({Handle:e,Data:t})))).then(e=>JSON.parse(e.Data||"{}").Data)}term(e){return this.channel.send(new I(new R(S.Term,JSON.stringify({Handle:e})))).then()}onConnectionFailed(){this.emit(new r)}},Object.defineProperty(e,"__esModule",{value:!0})});
//# sourceMappingURL=index.umd.min.js.map

;/*!
  * Bootstrap v5.3.3 (https://getbootstrap.com/)
  * Copyright 2011-2024 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).bootstrap=e()}(this,(function(){"use strict";const t=new Map,e={set(e,i,n){t.has(e)||t.set(e,new Map);const s=t.get(e);s.has(i)||0===s.size?s.set(i,n):console.error(`Bootstrap doesn't allow more than one instance per element. Bound instance: ${Array.from(s.keys())[0]}.`)},get:(e,i)=>t.has(e)&&t.get(e).get(i)||null,remove(e,i){if(!t.has(e))return;const n=t.get(e);n.delete(i),0===n.size&&t.delete(e)}},i="transitionend",n=t=>(t&&window.CSS&&window.CSS.escape&&(t=t.replace(/#([^\s"#']+)/g,((t,e)=>`#${CSS.escape(e)}`))),t),s=t=>{t.dispatchEvent(new Event(i))},o=t=>!(!t||"object"!=typeof t)&&(void 0!==t.jquery&&(t=t[0]),void 0!==t.nodeType),r=t=>o(t)?t.jquery?t[0]:t:"string"==typeof t&&t.length>0?document.querySelector(n(t)):null,a=t=>{if(!o(t)||0===t.getClientRects().length)return!1;const e="visible"===getComputedStyle(t).getPropertyValue("visibility"),i=t.closest("details:not([open])");if(!i)return e;if(i!==t){const e=t.closest("summary");if(e&&e.parentNode!==i)return!1;if(null===e)return!1}return e},l=t=>!t||t.nodeType!==Node.ELEMENT_NODE||!!t.classList.contains("disabled")||(void 0!==t.disabled?t.disabled:t.hasAttribute("disabled")&&"false"!==t.getAttribute("disabled")),c=t=>{if(!document.documentElement.attachShadow)return null;if("function"==typeof t.getRootNode){const e=t.getRootNode();return e instanceof ShadowRoot?e:null}return t instanceof ShadowRoot?t:t.parentNode?c(t.parentNode):null},h=()=>{},d=t=>{t.offsetHeight},u=()=>window.jQuery&&!document.body.hasAttribute("data-bs-no-jquery")?window.jQuery:null,f=[],p=()=>"rtl"===document.documentElement.dir,m=t=>{var e;e=()=>{const e=u();if(e){const i=t.NAME,n=e.fn[i];e.fn[i]=t.jQueryInterface,e.fn[i].Constructor=t,e.fn[i].noConflict=()=>(e.fn[i]=n,t.jQueryInterface)}},"loading"===document.readyState?(f.length||document.addEventListener("DOMContentLoaded",(()=>{for(const t of f)t()})),f.push(e)):e()},g=(t,e=[],i=t)=>"function"==typeof t?t(...e):i,_=(t,e,n=!0)=>{if(!n)return void g(t);const o=(t=>{if(!t)return 0;let{transitionDuration:e,transitionDelay:i}=window.getComputedStyle(t);const n=Number.parseFloat(e),s=Number.parseFloat(i);return n||s?(e=e.split(",")[0],i=i.split(",")[0],1e3*(Number.parseFloat(e)+Number.parseFloat(i))):0})(e)+5;let r=!1;const a=({target:n})=>{n===e&&(r=!0,e.removeEventListener(i,a),g(t))};e.addEventListener(i,a),setTimeout((()=>{r||s(e)}),o)},b=(t,e,i,n)=>{const s=t.length;let o=t.indexOf(e);return-1===o?!i&&n?t[s-1]:t[0]:(o+=i?1:-1,n&&(o=(o+s)%s),t[Math.max(0,Math.min(o,s-1))])},v=/[^.]*(?=\..*)\.|.*/,y=/\..*/,w=/::\d+$/,A={};let E=1;const T={mouseenter:"mouseover",mouseleave:"mouseout"},C=new Set(["click","dblclick","mouseup","mousedown","contextmenu","mousewheel","DOMMouseScroll","mouseover","mouseout","mousemove","selectstart","selectend","keydown","keypress","keyup","orientationchange","touchstart","touchmove","touchend","touchcancel","pointerdown","pointermove","pointerup","pointerleave","pointercancel","gesturestart","gesturechange","gestureend","focus","blur","change","reset","select","submit","focusin","focusout","load","unload","beforeunload","resize","move","DOMContentLoaded","readystatechange","error","abort","scroll"]);function O(t,e){return e&&`${e}::${E++}`||t.uidEvent||E++}function x(t){const e=O(t);return t.uidEvent=e,A[e]=A[e]||{},A[e]}function k(t,e,i=null){return Object.values(t).find((t=>t.callable===e&&t.delegationSelector===i))}function L(t,e,i){const n="string"==typeof e,s=n?i:e||i;let o=I(t);return C.has(o)||(o=t),[n,s,o]}function S(t,e,i,n,s){if("string"!=typeof e||!t)return;let[o,r,a]=L(e,i,n);if(e in T){const t=t=>function(e){if(!e.relatedTarget||e.relatedTarget!==e.delegateTarget&&!e.delegateTarget.contains(e.relatedTarget))return t.call(this,e)};r=t(r)}const l=x(t),c=l[a]||(l[a]={}),h=k(c,r,o?i:null);if(h)return void(h.oneOff=h.oneOff&&s);const d=O(r,e.replace(v,"")),u=o?function(t,e,i){return function n(s){const o=t.querySelectorAll(e);for(let{target:r}=s;r&&r!==this;r=r.parentNode)for(const a of o)if(a===r)return P(s,{delegateTarget:r}),n.oneOff&&N.off(t,s.type,e,i),i.apply(r,[s])}}(t,i,r):function(t,e){return function i(n){return P(n,{delegateTarget:t}),i.oneOff&&N.off(t,n.type,e),e.apply(t,[n])}}(t,r);u.delegationSelector=o?i:null,u.callable=r,u.oneOff=s,u.uidEvent=d,c[d]=u,t.addEventListener(a,u,o)}function D(t,e,i,n,s){const o=k(e[i],n,s);o&&(t.removeEventListener(i,o,Boolean(s)),delete e[i][o.uidEvent])}function $(t,e,i,n){const s=e[i]||{};for(const[o,r]of Object.entries(s))o.includes(n)&&D(t,e,i,r.callable,r.delegationSelector)}function I(t){return t=t.replace(y,""),T[t]||t}const N={on(t,e,i,n){S(t,e,i,n,!1)},one(t,e,i,n){S(t,e,i,n,!0)},off(t,e,i,n){if("string"!=typeof e||!t)return;const[s,o,r]=L(e,i,n),a=r!==e,l=x(t),c=l[r]||{},h=e.startsWith(".");if(void 0===o){if(h)for(const i of Object.keys(l))$(t,l,i,e.slice(1));for(const[i,n]of Object.entries(c)){const s=i.replace(w,"");a&&!e.includes(s)||D(t,l,r,n.callable,n.delegationSelector)}}else{if(!Object.keys(c).length)return;D(t,l,r,o,s?i:null)}},trigger(t,e,i){if("string"!=typeof e||!t)return null;const n=u();let s=null,o=!0,r=!0,a=!1;e!==I(e)&&n&&(s=n.Event(e,i),n(t).trigger(s),o=!s.isPropagationStopped(),r=!s.isImmediatePropagationStopped(),a=s.isDefaultPrevented());const l=P(new Event(e,{bubbles:o,cancelable:!0}),i);return a&&l.preventDefault(),r&&t.dispatchEvent(l),l.defaultPrevented&&s&&s.preventDefault(),l}};function P(t,e={}){for(const[i,n]of Object.entries(e))try{t[i]=n}catch(e){Object.defineProperty(t,i,{configurable:!0,get:()=>n})}return t}function j(t){if("true"===t)return!0;if("false"===t)return!1;if(t===Number(t).toString())return Number(t);if(""===t||"null"===t)return null;if("string"!=typeof t)return t;try{return JSON.parse(decodeURIComponent(t))}catch(e){return t}}function M(t){return t.replace(/[A-Z]/g,(t=>`-${t.toLowerCase()}`))}const F={setDataAttribute(t,e,i){t.setAttribute(`data-bs-${M(e)}`,i)},removeDataAttribute(t,e){t.removeAttribute(`data-bs-${M(e)}`)},getDataAttributes(t){if(!t)return{};const e={},i=Object.keys(t.dataset).filter((t=>t.startsWith("bs")&&!t.startsWith("bsConfig")));for(const n of i){let i=n.replace(/^bs/,"");i=i.charAt(0).toLowerCase()+i.slice(1,i.length),e[i]=j(t.dataset[n])}return e},getDataAttribute:(t,e)=>j(t.getAttribute(`data-bs-${M(e)}`))};class H{static get Default(){return{}}static get DefaultType(){return{}}static get NAME(){throw new Error('You have to implement the static method "NAME", for each component!')}_getConfig(t){return t=this._mergeConfigObj(t),t=this._configAfterMerge(t),this._typeCheckConfig(t),t}_configAfterMerge(t){return t}_mergeConfigObj(t,e){const i=o(e)?F.getDataAttribute(e,"config"):{};return{...this.constructor.Default,..."object"==typeof i?i:{},...o(e)?F.getDataAttributes(e):{},..."object"==typeof t?t:{}}}_typeCheckConfig(t,e=this.constructor.DefaultType){for(const[n,s]of Object.entries(e)){const e=t[n],r=o(e)?"element":null==(i=e)?`${i}`:Object.prototype.toString.call(i).match(/\s([a-z]+)/i)[1].toLowerCase();if(!new RegExp(s).test(r))throw new TypeError(`${this.constructor.NAME.toUpperCase()}: Option "${n}" provided type "${r}" but expected type "${s}".`)}var i}}class W extends H{constructor(t,i){super(),(t=r(t))&&(this._element=t,this._config=this._getConfig(i),e.set(this._element,this.constructor.DATA_KEY,this))}dispose(){e.remove(this._element,this.constructor.DATA_KEY),N.off(this._element,this.constructor.EVENT_KEY);for(const t of Object.getOwnPropertyNames(this))this[t]=null}_queueCallback(t,e,i=!0){_(t,e,i)}_getConfig(t){return t=this._mergeConfigObj(t,this._element),t=this._configAfterMerge(t),this._typeCheckConfig(t),t}static getInstance(t){return e.get(r(t),this.DATA_KEY)}static getOrCreateInstance(t,e={}){return this.getInstance(t)||new this(t,"object"==typeof e?e:null)}static get VERSION(){return"5.3.3"}static get DATA_KEY(){return`bs.${this.NAME}`}static get EVENT_KEY(){return`.${this.DATA_KEY}`}static eventName(t){return`${t}${this.EVENT_KEY}`}}const B=t=>{let e=t.getAttribute("data-bs-target");if(!e||"#"===e){let i=t.getAttribute("href");if(!i||!i.includes("#")&&!i.startsWith("."))return null;i.includes("#")&&!i.startsWith("#")&&(i=`#${i.split("#")[1]}`),e=i&&"#"!==i?i.trim():null}return e?e.split(",").map((t=>n(t))).join(","):null},z={find:(t,e=document.documentElement)=>[].concat(...Element.prototype.querySelectorAll.call(e,t)),findOne:(t,e=document.documentElement)=>Element.prototype.querySelector.call(e,t),children:(t,e)=>[].concat(...t.children).filter((t=>t.matches(e))),parents(t,e){const i=[];let n=t.parentNode.closest(e);for(;n;)i.push(n),n=n.parentNode.closest(e);return i},prev(t,e){let i=t.previousElementSibling;for(;i;){if(i.matches(e))return[i];i=i.previousElementSibling}return[]},next(t,e){let i=t.nextElementSibling;for(;i;){if(i.matches(e))return[i];i=i.nextElementSibling}return[]},focusableChildren(t){const e=["a","button","input","textarea","select","details","[tabindex]",'[contenteditable="true"]'].map((t=>`${t}:not([tabindex^="-"])`)).join(",");return this.find(e,t).filter((t=>!l(t)&&a(t)))},getSelectorFromElement(t){const e=B(t);return e&&z.findOne(e)?e:null},getElementFromSelector(t){const e=B(t);return e?z.findOne(e):null},getMultipleElementsFromSelector(t){const e=B(t);return e?z.find(e):[]}},R=(t,e="hide")=>{const i=`click.dismiss${t.EVENT_KEY}`,n=t.NAME;N.on(document,i,`[data-bs-dismiss="${n}"]`,(function(i){if(["A","AREA"].includes(this.tagName)&&i.preventDefault(),l(this))return;const s=z.getElementFromSelector(this)||this.closest(`.${n}`);t.getOrCreateInstance(s)[e]()}))},q=".bs.alert",V=`close${q}`,K=`closed${q}`;class Q extends W{static get NAME(){return"alert"}close(){if(N.trigger(this._element,V).defaultPrevented)return;this._element.classList.remove("show");const t=this._element.classList.contains("fade");this._queueCallback((()=>this._destroyElement()),this._element,t)}_destroyElement(){this._element.remove(),N.trigger(this._element,K),this.dispose()}static jQueryInterface(t){return this.each((function(){const e=Q.getOrCreateInstance(this);if("string"==typeof t){if(void 0===e[t]||t.startsWith("_")||"constructor"===t)throw new TypeError(`No method named "${t}"`);e[t](this)}}))}}R(Q,"close"),m(Q);const X='[data-bs-toggle="button"]';class Y extends W{static get NAME(){return"button"}toggle(){this._element.setAttribute("aria-pressed",this._element.classList.toggle("active"))}static jQueryInterface(t){return this.each((function(){const e=Y.getOrCreateInstance(this);"toggle"===t&&e[t]()}))}}N.on(document,"click.bs.button.data-api",X,(t=>{t.preventDefault();const e=t.target.closest(X);Y.getOrCreateInstance(e).toggle()})),m(Y);const U=".bs.swipe",G=`touchstart${U}`,J=`touchmove${U}`,Z=`touchend${U}`,tt=`pointerdown${U}`,et=`pointerup${U}`,it={endCallback:null,leftCallback:null,rightCallback:null},nt={endCallback:"(function|null)",leftCallback:"(function|null)",rightCallback:"(function|null)"};class st extends H{constructor(t,e){super(),this._element=t,t&&st.isSupported()&&(this._config=this._getConfig(e),this._deltaX=0,this._supportPointerEvents=Boolean(window.PointerEvent),this._initEvents())}static get Default(){return it}static get DefaultType(){return nt}static get NAME(){return"swipe"}dispose(){N.off(this._element,U)}_start(t){this._supportPointerEvents?this._eventIsPointerPenTouch(t)&&(this._deltaX=t.clientX):this._deltaX=t.touches[0].clientX}_end(t){this._eventIsPointerPenTouch(t)&&(this._deltaX=t.clientX-this._deltaX),this._handleSwipe(),g(this._config.endCallback)}_move(t){this._deltaX=t.touches&&t.touches.length>1?0:t.touches[0].clientX-this._deltaX}_handleSwipe(){const t=Math.abs(this._deltaX);if(t<=40)return;const e=t/this._deltaX;this._deltaX=0,e&&g(e>0?this._config.rightCallback:this._config.leftCallback)}_initEvents(){this._supportPointerEvents?(N.on(this._element,tt,(t=>this._start(t))),N.on(this._element,et,(t=>this._end(t))),this._element.classList.add("pointer-event")):(N.on(this._element,G,(t=>this._start(t))),N.on(this._element,J,(t=>this._move(t))),N.on(this._element,Z,(t=>this._end(t))))}_eventIsPointerPenTouch(t){return this._supportPointerEvents&&("pen"===t.pointerType||"touch"===t.pointerType)}static isSupported(){return"ontouchstart"in document.documentElement||navigator.maxTouchPoints>0}}const ot=".bs.carousel",rt=".data-api",at="next",lt="prev",ct="left",ht="right",dt=`slide${ot}`,ut=`slid${ot}`,ft=`keydown${ot}`,pt=`mouseenter${ot}`,mt=`mouseleave${ot}`,gt=`dragstart${ot}`,_t=`load${ot}${rt}`,bt=`click${ot}${rt}`,vt="carousel",yt="active",wt=".active",At=".carousel-item",Et=wt+At,Tt={ArrowLeft:ht,ArrowRight:ct},Ct={interval:5e3,keyboard:!0,pause:"hover",ride:!1,touch:!0,wrap:!0},Ot={interval:"(number|boolean)",keyboard:"boolean",pause:"(string|boolean)",ride:"(boolean|string)",touch:"boolean",wrap:"boolean"};class xt extends W{constructor(t,e){super(t,e),this._interval=null,this._activeElement=null,this._isSliding=!1,this.touchTimeout=null,this._swipeHelper=null,this._indicatorsElement=z.findOne(".carousel-indicators",this._element),this._addEventListeners(),this._config.ride===vt&&this.cycle()}static get Default(){return Ct}static get DefaultType(){return Ot}static get NAME(){return"carousel"}next(){this._slide(at)}nextWhenVisible(){!document.hidden&&a(this._element)&&this.next()}prev(){this._slide(lt)}pause(){this._isSliding&&s(this._element),this._clearInterval()}cycle(){this._clearInterval(),this._updateInterval(),this._interval=setInterval((()=>this.nextWhenVisible()),this._config.interval)}_maybeEnableCycle(){this._config.ride&&(this._isSliding?N.one(this._element,ut,(()=>this.cycle())):this.cycle())}to(t){const e=this._getItems();if(t>e.length-1||t<0)return;if(this._isSliding)return void N.one(this._element,ut,(()=>this.to(t)));const i=this._getItemIndex(this._getActive());if(i===t)return;const n=t>i?at:lt;this._slide(n,e[t])}dispose(){this._swipeHelper&&this._swipeHelper.dispose(),super.dispose()}_configAfterMerge(t){return t.defaultInterval=t.interval,t}_addEventListeners(){this._config.keyboard&&N.on(this._element,ft,(t=>this._keydown(t))),"hover"===this._config.pause&&(N.on(this._element,pt,(()=>this.pause())),N.on(this._element,mt,(()=>this._maybeEnableCycle()))),this._config.touch&&st.isSupported()&&this._addTouchEventListeners()}_addTouchEventListeners(){for(const t of z.find(".carousel-item img",this._element))N.on(t,gt,(t=>t.preventDefault()));const t={leftCallback:()=>this._slide(this._directionToOrder(ct)),rightCallback:()=>this._slide(this._directionToOrder(ht)),endCallback:()=>{"hover"===this._config.pause&&(this.pause(),this.touchTimeout&&clearTimeout(this.touchTimeout),this.touchTimeout=setTimeout((()=>this._maybeEnableCycle()),500+this._config.interval))}};this._swipeHelper=new st(this._element,t)}_keydown(t){if(/input|textarea/i.test(t.target.tagName))return;const e=Tt[t.key];e&&(t.preventDefault(),this._slide(this._directionToOrder(e)))}_getItemIndex(t){return this._getItems().indexOf(t)}_setActiveIndicatorElement(t){if(!this._indicatorsElement)return;const e=z.findOne(wt,this._indicatorsElement);e.classList.remove(yt),e.removeAttribute("aria-current");const i=z.findOne(`[data-bs-slide-to="${t}"]`,this._indicatorsElement);i&&(i.classList.add(yt),i.setAttribute("aria-current","true"))}_updateInterval(){const t=this._activeElement||this._getActive();if(!t)return;const e=Number.parseInt(t.getAttribute("data-bs-interval"),10);this._config.interval=e||this._config.defaultInterval}_slide(t,e=null){if(this._isSliding)return;const i=this._getActive(),n=t===at,s=e||b(this._getItems(),i,n,this._config.wrap);if(s===i)return;const o=this._getItemIndex(s),r=e=>N.trigger(this._element,e,{relatedTarget:s,direction:this._orderToDirection(t),from:this._getItemIndex(i),to:o});if(r(dt).defaultPrevented)return;if(!i||!s)return;const a=Boolean(this._interval);this.pause(),this._isSliding=!0,this._setActiveIndicatorElement(o),this._activeElement=s;const l=n?"carousel-item-start":"carousel-item-end",c=n?"carousel-item-next":"carousel-item-prev";s.classList.add(c),d(s),i.classList.add(l),s.classList.add(l),this._queueCallback((()=>{s.classList.remove(l,c),s.classList.add(yt),i.classList.remove(yt,c,l),this._isSliding=!1,r(ut)}),i,this._isAnimated()),a&&this.cycle()}_isAnimated(){return this._element.classList.contains("slide")}_getActive(){return z.findOne(Et,this._element)}_getItems(){return z.find(At,this._element)}_clearInterval(){this._interval&&(clearInterval(this._interval),this._interval=null)}_directionToOrder(t){return p()?t===ct?lt:at:t===ct?at:lt}_orderToDirection(t){return p()?t===lt?ct:ht:t===lt?ht:ct}static jQueryInterface(t){return this.each((function(){const e=xt.getOrCreateInstance(this,t);if("number"!=typeof t){if("string"==typeof t){if(void 0===e[t]||t.startsWith("_")||"constructor"===t)throw new TypeError(`No method named "${t}"`);e[t]()}}else e.to(t)}))}}N.on(document,bt,"[data-bs-slide], [data-bs-slide-to]",(function(t){const e=z.getElementFromSelector(this);if(!e||!e.classList.contains(vt))return;t.preventDefault();const i=xt.getOrCreateInstance(e),n=this.getAttribute("data-bs-slide-to");return n?(i.to(n),void i._maybeEnableCycle()):"next"===F.getDataAttribute(this,"slide")?(i.next(),void i._maybeEnableCycle()):(i.prev(),void i._maybeEnableCycle())})),N.on(window,_t,(()=>{const t=z.find('[data-bs-ride="carousel"]');for(const e of t)xt.getOrCreateInstance(e)})),m(xt);const kt=".bs.collapse",Lt=`show${kt}`,St=`shown${kt}`,Dt=`hide${kt}`,$t=`hidden${kt}`,It=`click${kt}.data-api`,Nt="show",Pt="collapse",jt="collapsing",Mt=`:scope .${Pt} .${Pt}`,Ft='[data-bs-toggle="collapse"]',Ht={parent:null,toggle:!0},Wt={parent:"(null|element)",toggle:"boolean"};class Bt extends W{constructor(t,e){super(t,e),this._isTransitioning=!1,this._triggerArray=[];const i=z.find(Ft);for(const t of i){const e=z.getSelectorFromElement(t),i=z.find(e).filter((t=>t===this._element));null!==e&&i.length&&this._triggerArray.push(t)}this._initializeChildren(),this._config.parent||this._addAriaAndCollapsedClass(this._triggerArray,this._isShown()),this._config.toggle&&this.toggle()}static get Default(){return Ht}static get DefaultType(){return Wt}static get NAME(){return"collapse"}toggle(){this._isShown()?this.hide():this.show()}show(){if(this._isTransitioning||this._isShown())return;let t=[];if(this._config.parent&&(t=this._getFirstLevelChildren(".collapse.show, .collapse.collapsing").filter((t=>t!==this._element)).map((t=>Bt.getOrCreateInstance(t,{toggle:!1})))),t.length&&t[0]._isTransitioning)return;if(N.trigger(this._element,Lt).defaultPrevented)return;for(const e of t)e.hide();const e=this._getDimension();this._element.classList.remove(Pt),this._element.classList.add(jt),this._element.style[e]=0,this._addAriaAndCollapsedClass(this._triggerArray,!0),this._isTransitioning=!0;const i=`scroll${e[0].toUpperCase()+e.slice(1)}`;this._queueCallback((()=>{this._isTransitioning=!1,this._element.classList.remove(jt),this._element.classList.add(Pt,Nt),this._element.style[e]="",N.trigger(this._element,St)}),this._element,!0),this._element.style[e]=`${this._element[i]}px`}hide(){if(this._isTransitioning||!this._isShown())return;if(N.trigger(this._element,Dt).defaultPrevented)return;const t=this._getDimension();this._element.style[t]=`${this._element.getBoundingClientRect()[t]}px`,d(this._element),this._element.classList.add(jt),this._element.classList.remove(Pt,Nt);for(const t of this._triggerArray){const e=z.getElementFromSelector(t);e&&!this._isShown(e)&&this._addAriaAndCollapsedClass([t],!1)}this._isTransitioning=!0,this._element.style[t]="",this._queueCallback((()=>{this._isTransitioning=!1,this._element.classList.remove(jt),this._element.classList.add(Pt),N.trigger(this._element,$t)}),this._element,!0)}_isShown(t=this._element){return t.classList.contains(Nt)}_configAfterMerge(t){return t.toggle=Boolean(t.toggle),t.parent=r(t.parent),t}_getDimension(){return this._element.classList.contains("collapse-horizontal")?"width":"height"}_initializeChildren(){if(!this._config.parent)return;const t=this._getFirstLevelChildren(Ft);for(const e of t){const t=z.getElementFromSelector(e);t&&this._addAriaAndCollapsedClass([e],this._isShown(t))}}_getFirstLevelChildren(t){const e=z.find(Mt,this._config.parent);return z.find(t,this._config.parent).filter((t=>!e.includes(t)))}_addAriaAndCollapsedClass(t,e){if(t.length)for(const i of t)i.classList.toggle("collapsed",!e),i.setAttribute("aria-expanded",e)}static jQueryInterface(t){const e={};return"string"==typeof t&&/show|hide/.test(t)&&(e.toggle=!1),this.each((function(){const i=Bt.getOrCreateInstance(this,e);if("string"==typeof t){if(void 0===i[t])throw new TypeError(`No method named "${t}"`);i[t]()}}))}}N.on(document,It,Ft,(function(t){("A"===t.target.tagName||t.delegateTarget&&"A"===t.delegateTarget.tagName)&&t.preventDefault();for(const t of z.getMultipleElementsFromSelector(this))Bt.getOrCreateInstance(t,{toggle:!1}).toggle()})),m(Bt);var zt="top",Rt="bottom",qt="right",Vt="left",Kt="auto",Qt=[zt,Rt,qt,Vt],Xt="start",Yt="end",Ut="clippingParents",Gt="viewport",Jt="popper",Zt="reference",te=Qt.reduce((function(t,e){return t.concat([e+"-"+Xt,e+"-"+Yt])}),[]),ee=[].concat(Qt,[Kt]).reduce((function(t,e){return t.concat([e,e+"-"+Xt,e+"-"+Yt])}),[]),ie="beforeRead",ne="read",se="afterRead",oe="beforeMain",re="main",ae="afterMain",le="beforeWrite",ce="write",he="afterWrite",de=[ie,ne,se,oe,re,ae,le,ce,he];function ue(t){return t?(t.nodeName||"").toLowerCase():null}function fe(t){if(null==t)return window;if("[object Window]"!==t.toString()){var e=t.ownerDocument;return e&&e.defaultView||window}return t}function pe(t){return t instanceof fe(t).Element||t instanceof Element}function me(t){return t instanceof fe(t).HTMLElement||t instanceof HTMLElement}function ge(t){return"undefined"!=typeof ShadowRoot&&(t instanceof fe(t).ShadowRoot||t instanceof ShadowRoot)}const _e={name:"applyStyles",enabled:!0,phase:"write",fn:function(t){var e=t.state;Object.keys(e.elements).forEach((function(t){var i=e.styles[t]||{},n=e.attributes[t]||{},s=e.elements[t];me(s)&&ue(s)&&(Object.assign(s.style,i),Object.keys(n).forEach((function(t){var e=n[t];!1===e?s.removeAttribute(t):s.setAttribute(t,!0===e?"":e)})))}))},effect:function(t){var e=t.state,i={popper:{position:e.options.strategy,left:"0",top:"0",margin:"0"},arrow:{position:"absolute"},reference:{}};return Object.assign(e.elements.popper.style,i.popper),e.styles=i,e.elements.arrow&&Object.assign(e.elements.arrow.style,i.arrow),function(){Object.keys(e.elements).forEach((function(t){var n=e.elements[t],s=e.attributes[t]||{},o=Object.keys(e.styles.hasOwnProperty(t)?e.styles[t]:i[t]).reduce((function(t,e){return t[e]="",t}),{});me(n)&&ue(n)&&(Object.assign(n.style,o),Object.keys(s).forEach((function(t){n.removeAttribute(t)})))}))}},requires:["computeStyles"]};function be(t){return t.split("-")[0]}var ve=Math.max,ye=Math.min,we=Math.round;function Ae(){var t=navigator.userAgentData;return null!=t&&t.brands&&Array.isArray(t.brands)?t.brands.map((function(t){return t.brand+"/"+t.version})).join(" "):navigator.userAgent}function Ee(){return!/^((?!chrome|android).)*safari/i.test(Ae())}function Te(t,e,i){void 0===e&&(e=!1),void 0===i&&(i=!1);var n=t.getBoundingClientRect(),s=1,o=1;e&&me(t)&&(s=t.offsetWidth>0&&we(n.width)/t.offsetWidth||1,o=t.offsetHeight>0&&we(n.height)/t.offsetHeight||1);var r=(pe(t)?fe(t):window).visualViewport,a=!Ee()&&i,l=(n.left+(a&&r?r.offsetLeft:0))/s,c=(n.top+(a&&r?r.offsetTop:0))/o,h=n.width/s,d=n.height/o;return{width:h,height:d,top:c,right:l+h,bottom:c+d,left:l,x:l,y:c}}function Ce(t){var e=Te(t),i=t.offsetWidth,n=t.offsetHeight;return Math.abs(e.width-i)<=1&&(i=e.width),Math.abs(e.height-n)<=1&&(n=e.height),{x:t.offsetLeft,y:t.offsetTop,width:i,height:n}}function Oe(t,e){var i=e.getRootNode&&e.getRootNode();if(t.contains(e))return!0;if(i&&ge(i)){var n=e;do{if(n&&t.isSameNode(n))return!0;n=n.parentNode||n.host}while(n)}return!1}function xe(t){return fe(t).getComputedStyle(t)}function ke(t){return["table","td","th"].indexOf(ue(t))>=0}function Le(t){return((pe(t)?t.ownerDocument:t.document)||window.document).documentElement}function Se(t){return"html"===ue(t)?t:t.assignedSlot||t.parentNode||(ge(t)?t.host:null)||Le(t)}function De(t){return me(t)&&"fixed"!==xe(t).position?t.offsetParent:null}function $e(t){for(var e=fe(t),i=De(t);i&&ke(i)&&"static"===xe(i).position;)i=De(i);return i&&("html"===ue(i)||"body"===ue(i)&&"static"===xe(i).position)?e:i||function(t){var e=/firefox/i.test(Ae());if(/Trident/i.test(Ae())&&me(t)&&"fixed"===xe(t).position)return null;var i=Se(t);for(ge(i)&&(i=i.host);me(i)&&["html","body"].indexOf(ue(i))<0;){var n=xe(i);if("none"!==n.transform||"none"!==n.perspective||"paint"===n.contain||-1!==["transform","perspective"].indexOf(n.willChange)||e&&"filter"===n.willChange||e&&n.filter&&"none"!==n.filter)return i;i=i.parentNode}return null}(t)||e}function Ie(t){return["top","bottom"].indexOf(t)>=0?"x":"y"}function Ne(t,e,i){return ve(t,ye(e,i))}function Pe(t){return Object.assign({},{top:0,right:0,bottom:0,left:0},t)}function je(t,e){return e.reduce((function(e,i){return e[i]=t,e}),{})}const Me={name:"arrow",enabled:!0,phase:"main",fn:function(t){var e,i=t.state,n=t.name,s=t.options,o=i.elements.arrow,r=i.modifiersData.popperOffsets,a=be(i.placement),l=Ie(a),c=[Vt,qt].indexOf(a)>=0?"height":"width";if(o&&r){var h=function(t,e){return Pe("number"!=typeof(t="function"==typeof t?t(Object.assign({},e.rects,{placement:e.placement})):t)?t:je(t,Qt))}(s.padding,i),d=Ce(o),u="y"===l?zt:Vt,f="y"===l?Rt:qt,p=i.rects.reference[c]+i.rects.reference[l]-r[l]-i.rects.popper[c],m=r[l]-i.rects.reference[l],g=$e(o),_=g?"y"===l?g.clientHeight||0:g.clientWidth||0:0,b=p/2-m/2,v=h[u],y=_-d[c]-h[f],w=_/2-d[c]/2+b,A=Ne(v,w,y),E=l;i.modifiersData[n]=((e={})[E]=A,e.centerOffset=A-w,e)}},effect:function(t){var e=t.state,i=t.options.element,n=void 0===i?"[data-popper-arrow]":i;null!=n&&("string"!=typeof n||(n=e.elements.popper.querySelector(n)))&&Oe(e.elements.popper,n)&&(e.elements.arrow=n)},requires:["popperOffsets"],requiresIfExists:["preventOverflow"]};function Fe(t){return t.split("-")[1]}var He={top:"auto",right:"auto",bottom:"auto",left:"auto"};function We(t){var e,i=t.popper,n=t.popperRect,s=t.placement,o=t.variation,r=t.offsets,a=t.position,l=t.gpuAcceleration,c=t.adaptive,h=t.roundOffsets,d=t.isFixed,u=r.x,f=void 0===u?0:u,p=r.y,m=void 0===p?0:p,g="function"==typeof h?h({x:f,y:m}):{x:f,y:m};f=g.x,m=g.y;var _=r.hasOwnProperty("x"),b=r.hasOwnProperty("y"),v=Vt,y=zt,w=window;if(c){var A=$e(i),E="clientHeight",T="clientWidth";A===fe(i)&&"static"!==xe(A=Le(i)).position&&"absolute"===a&&(E="scrollHeight",T="scrollWidth"),(s===zt||(s===Vt||s===qt)&&o===Yt)&&(y=Rt,m-=(d&&A===w&&w.visualViewport?w.visualViewport.height:A[E])-n.height,m*=l?1:-1),s!==Vt&&(s!==zt&&s!==Rt||o!==Yt)||(v=qt,f-=(d&&A===w&&w.visualViewport?w.visualViewport.width:A[T])-n.width,f*=l?1:-1)}var C,O=Object.assign({position:a},c&&He),x=!0===h?function(t,e){var i=t.x,n=t.y,s=e.devicePixelRatio||1;return{x:we(i*s)/s||0,y:we(n*s)/s||0}}({x:f,y:m},fe(i)):{x:f,y:m};return f=x.x,m=x.y,l?Object.assign({},O,((C={})[y]=b?"0":"",C[v]=_?"0":"",C.transform=(w.devicePixelRatio||1)<=1?"translate("+f+"px, "+m+"px)":"translate3d("+f+"px, "+m+"px, 0)",C)):Object.assign({},O,((e={})[y]=b?m+"px":"",e[v]=_?f+"px":"",e.transform="",e))}const Be={name:"computeStyles",enabled:!0,phase:"beforeWrite",fn:function(t){var e=t.state,i=t.options,n=i.gpuAcceleration,s=void 0===n||n,o=i.adaptive,r=void 0===o||o,a=i.roundOffsets,l=void 0===a||a,c={placement:be(e.placement),variation:Fe(e.placement),popper:e.elements.popper,popperRect:e.rects.popper,gpuAcceleration:s,isFixed:"fixed"===e.options.strategy};null!=e.modifiersData.popperOffsets&&(e.styles.popper=Object.assign({},e.styles.popper,We(Object.assign({},c,{offsets:e.modifiersData.popperOffsets,position:e.options.strategy,adaptive:r,roundOffsets:l})))),null!=e.modifiersData.arrow&&(e.styles.arrow=Object.assign({},e.styles.arrow,We(Object.assign({},c,{offsets:e.modifiersData.arrow,position:"absolute",adaptive:!1,roundOffsets:l})))),e.attributes.popper=Object.assign({},e.attributes.popper,{"data-popper-placement":e.placement})},data:{}};var ze={passive:!0};const Re={name:"eventListeners",enabled:!0,phase:"write",fn:function(){},effect:function(t){var e=t.state,i=t.instance,n=t.options,s=n.scroll,o=void 0===s||s,r=n.resize,a=void 0===r||r,l=fe(e.elements.popper),c=[].concat(e.scrollParents.reference,e.scrollParents.popper);return o&&c.forEach((function(t){t.addEventListener("scroll",i.update,ze)})),a&&l.addEventListener("resize",i.update,ze),function(){o&&c.forEach((function(t){t.removeEventListener("scroll",i.update,ze)})),a&&l.removeEventListener("resize",i.update,ze)}},data:{}};var qe={left:"right",right:"left",bottom:"top",top:"bottom"};function Ve(t){return t.replace(/left|right|bottom|top/g,(function(t){return qe[t]}))}var Ke={start:"end",end:"start"};function Qe(t){return t.replace(/start|end/g,(function(t){return Ke[t]}))}function Xe(t){var e=fe(t);return{scrollLeft:e.pageXOffset,scrollTop:e.pageYOffset}}function Ye(t){return Te(Le(t)).left+Xe(t).scrollLeft}function Ue(t){var e=xe(t),i=e.overflow,n=e.overflowX,s=e.overflowY;return/auto|scroll|overlay|hidden/.test(i+s+n)}function Ge(t){return["html","body","#document"].indexOf(ue(t))>=0?t.ownerDocument.body:me(t)&&Ue(t)?t:Ge(Se(t))}function Je(t,e){var i;void 0===e&&(e=[]);var n=Ge(t),s=n===(null==(i=t.ownerDocument)?void 0:i.body),o=fe(n),r=s?[o].concat(o.visualViewport||[],Ue(n)?n:[]):n,a=e.concat(r);return s?a:a.concat(Je(Se(r)))}function Ze(t){return Object.assign({},t,{left:t.x,top:t.y,right:t.x+t.width,bottom:t.y+t.height})}function ti(t,e,i){return e===Gt?Ze(function(t,e){var i=fe(t),n=Le(t),s=i.visualViewport,o=n.clientWidth,r=n.clientHeight,a=0,l=0;if(s){o=s.width,r=s.height;var c=Ee();(c||!c&&"fixed"===e)&&(a=s.offsetLeft,l=s.offsetTop)}return{width:o,height:r,x:a+Ye(t),y:l}}(t,i)):pe(e)?function(t,e){var i=Te(t,!1,"fixed"===e);return i.top=i.top+t.clientTop,i.left=i.left+t.clientLeft,i.bottom=i.top+t.clientHeight,i.right=i.left+t.clientWidth,i.width=t.clientWidth,i.height=t.clientHeight,i.x=i.left,i.y=i.top,i}(e,i):Ze(function(t){var e,i=Le(t),n=Xe(t),s=null==(e=t.ownerDocument)?void 0:e.body,o=ve(i.scrollWidth,i.clientWidth,s?s.scrollWidth:0,s?s.clientWidth:0),r=ve(i.scrollHeight,i.clientHeight,s?s.scrollHeight:0,s?s.clientHeight:0),a=-n.scrollLeft+Ye(t),l=-n.scrollTop;return"rtl"===xe(s||i).direction&&(a+=ve(i.clientWidth,s?s.clientWidth:0)-o),{width:o,height:r,x:a,y:l}}(Le(t)))}function ei(t){var e,i=t.reference,n=t.element,s=t.placement,o=s?be(s):null,r=s?Fe(s):null,a=i.x+i.width/2-n.width/2,l=i.y+i.height/2-n.height/2;switch(o){case zt:e={x:a,y:i.y-n.height};break;case Rt:e={x:a,y:i.y+i.height};break;case qt:e={x:i.x+i.width,y:l};break;case Vt:e={x:i.x-n.width,y:l};break;default:e={x:i.x,y:i.y}}var c=o?Ie(o):null;if(null!=c){var h="y"===c?"height":"width";switch(r){case Xt:e[c]=e[c]-(i[h]/2-n[h]/2);break;case Yt:e[c]=e[c]+(i[h]/2-n[h]/2)}}return e}function ii(t,e){void 0===e&&(e={});var i=e,n=i.placement,s=void 0===n?t.placement:n,o=i.strategy,r=void 0===o?t.strategy:o,a=i.boundary,l=void 0===a?Ut:a,c=i.rootBoundary,h=void 0===c?Gt:c,d=i.elementContext,u=void 0===d?Jt:d,f=i.altBoundary,p=void 0!==f&&f,m=i.padding,g=void 0===m?0:m,_=Pe("number"!=typeof g?g:je(g,Qt)),b=u===Jt?Zt:Jt,v=t.rects.popper,y=t.elements[p?b:u],w=function(t,e,i,n){var s="clippingParents"===e?function(t){var e=Je(Se(t)),i=["absolute","fixed"].indexOf(xe(t).position)>=0&&me(t)?$e(t):t;return pe(i)?e.filter((function(t){return pe(t)&&Oe(t,i)&&"body"!==ue(t)})):[]}(t):[].concat(e),o=[].concat(s,[i]),r=o[0],a=o.reduce((function(e,i){var s=ti(t,i,n);return e.top=ve(s.top,e.top),e.right=ye(s.right,e.right),e.bottom=ye(s.bottom,e.bottom),e.left=ve(s.left,e.left),e}),ti(t,r,n));return a.width=a.right-a.left,a.height=a.bottom-a.top,a.x=a.left,a.y=a.top,a}(pe(y)?y:y.contextElement||Le(t.elements.popper),l,h,r),A=Te(t.elements.reference),E=ei({reference:A,element:v,strategy:"absolute",placement:s}),T=Ze(Object.assign({},v,E)),C=u===Jt?T:A,O={top:w.top-C.top+_.top,bottom:C.bottom-w.bottom+_.bottom,left:w.left-C.left+_.left,right:C.right-w.right+_.right},x=t.modifiersData.offset;if(u===Jt&&x){var k=x[s];Object.keys(O).forEach((function(t){var e=[qt,Rt].indexOf(t)>=0?1:-1,i=[zt,Rt].indexOf(t)>=0?"y":"x";O[t]+=k[i]*e}))}return O}function ni(t,e){void 0===e&&(e={});var i=e,n=i.placement,s=i.boundary,o=i.rootBoundary,r=i.padding,a=i.flipVariations,l=i.allowedAutoPlacements,c=void 0===l?ee:l,h=Fe(n),d=h?a?te:te.filter((function(t){return Fe(t)===h})):Qt,u=d.filter((function(t){return c.indexOf(t)>=0}));0===u.length&&(u=d);var f=u.reduce((function(e,i){return e[i]=ii(t,{placement:i,boundary:s,rootBoundary:o,padding:r})[be(i)],e}),{});return Object.keys(f).sort((function(t,e){return f[t]-f[e]}))}const si={name:"flip",enabled:!0,phase:"main",fn:function(t){var e=t.state,i=t.options,n=t.name;if(!e.modifiersData[n]._skip){for(var s=i.mainAxis,o=void 0===s||s,r=i.altAxis,a=void 0===r||r,l=i.fallbackPlacements,c=i.padding,h=i.boundary,d=i.rootBoundary,u=i.altBoundary,f=i.flipVariations,p=void 0===f||f,m=i.allowedAutoPlacements,g=e.options.placement,_=be(g),b=l||(_!==g&&p?function(t){if(be(t)===Kt)return[];var e=Ve(t);return[Qe(t),e,Qe(e)]}(g):[Ve(g)]),v=[g].concat(b).reduce((function(t,i){return t.concat(be(i)===Kt?ni(e,{placement:i,boundary:h,rootBoundary:d,padding:c,flipVariations:p,allowedAutoPlacements:m}):i)}),[]),y=e.rects.reference,w=e.rects.popper,A=new Map,E=!0,T=v[0],C=0;C<v.length;C++){var O=v[C],x=be(O),k=Fe(O)===Xt,L=[zt,Rt].indexOf(x)>=0,S=L?"width":"height",D=ii(e,{placement:O,boundary:h,rootBoundary:d,altBoundary:u,padding:c}),$=L?k?qt:Vt:k?Rt:zt;y[S]>w[S]&&($=Ve($));var I=Ve($),N=[];if(o&&N.push(D[x]<=0),a&&N.push(D[$]<=0,D[I]<=0),N.every((function(t){return t}))){T=O,E=!1;break}A.set(O,N)}if(E)for(var P=function(t){var e=v.find((function(e){var i=A.get(e);if(i)return i.slice(0,t).every((function(t){return t}))}));if(e)return T=e,"break"},j=p?3:1;j>0&&"break"!==P(j);j--);e.placement!==T&&(e.modifiersData[n]._skip=!0,e.placement=T,e.reset=!0)}},requiresIfExists:["offset"],data:{_skip:!1}};function oi(t,e,i){return void 0===i&&(i={x:0,y:0}),{top:t.top-e.height-i.y,right:t.right-e.width+i.x,bottom:t.bottom-e.height+i.y,left:t.left-e.width-i.x}}function ri(t){return[zt,qt,Rt,Vt].some((function(e){return t[e]>=0}))}const ai={name:"hide",enabled:!0,phase:"main",requiresIfExists:["preventOverflow"],fn:function(t){var e=t.state,i=t.name,n=e.rects.reference,s=e.rects.popper,o=e.modifiersData.preventOverflow,r=ii(e,{elementContext:"reference"}),a=ii(e,{altBoundary:!0}),l=oi(r,n),c=oi(a,s,o),h=ri(l),d=ri(c);e.modifiersData[i]={referenceClippingOffsets:l,popperEscapeOffsets:c,isReferenceHidden:h,hasPopperEscaped:d},e.attributes.popper=Object.assign({},e.attributes.popper,{"data-popper-reference-hidden":h,"data-popper-escaped":d})}},li={name:"offset",enabled:!0,phase:"main",requires:["popperOffsets"],fn:function(t){var e=t.state,i=t.options,n=t.name,s=i.offset,o=void 0===s?[0,0]:s,r=ee.reduce((function(t,i){return t[i]=function(t,e,i){var n=be(t),s=[Vt,zt].indexOf(n)>=0?-1:1,o="function"==typeof i?i(Object.assign({},e,{placement:t})):i,r=o[0],a=o[1];return r=r||0,a=(a||0)*s,[Vt,qt].indexOf(n)>=0?{x:a,y:r}:{x:r,y:a}}(i,e.rects,o),t}),{}),a=r[e.placement],l=a.x,c=a.y;null!=e.modifiersData.popperOffsets&&(e.modifiersData.popperOffsets.x+=l,e.modifiersData.popperOffsets.y+=c),e.modifiersData[n]=r}},ci={name:"popperOffsets",enabled:!0,phase:"read",fn:function(t){var e=t.state,i=t.name;e.modifiersData[i]=ei({reference:e.rects.reference,element:e.rects.popper,strategy:"absolute",placement:e.placement})},data:{}},hi={name:"preventOverflow",enabled:!0,phase:"main",fn:function(t){var e=t.state,i=t.options,n=t.name,s=i.mainAxis,o=void 0===s||s,r=i.altAxis,a=void 0!==r&&r,l=i.boundary,c=i.rootBoundary,h=i.altBoundary,d=i.padding,u=i.tether,f=void 0===u||u,p=i.tetherOffset,m=void 0===p?0:p,g=ii(e,{boundary:l,rootBoundary:c,padding:d,altBoundary:h}),_=be(e.placement),b=Fe(e.placement),v=!b,y=Ie(_),w="x"===y?"y":"x",A=e.modifiersData.popperOffsets,E=e.rects.reference,T=e.rects.popper,C="function"==typeof m?m(Object.assign({},e.rects,{placement:e.placement})):m,O="number"==typeof C?{mainAxis:C,altAxis:C}:Object.assign({mainAxis:0,altAxis:0},C),x=e.modifiersData.offset?e.modifiersData.offset[e.placement]:null,k={x:0,y:0};if(A){if(o){var L,S="y"===y?zt:Vt,D="y"===y?Rt:qt,$="y"===y?"height":"width",I=A[y],N=I+g[S],P=I-g[D],j=f?-T[$]/2:0,M=b===Xt?E[$]:T[$],F=b===Xt?-T[$]:-E[$],H=e.elements.arrow,W=f&&H?Ce(H):{width:0,height:0},B=e.modifiersData["arrow#persistent"]?e.modifiersData["arrow#persistent"].padding:{top:0,right:0,bottom:0,left:0},z=B[S],R=B[D],q=Ne(0,E[$],W[$]),V=v?E[$]/2-j-q-z-O.mainAxis:M-q-z-O.mainAxis,K=v?-E[$]/2+j+q+R+O.mainAxis:F+q+R+O.mainAxis,Q=e.elements.arrow&&$e(e.elements.arrow),X=Q?"y"===y?Q.clientTop||0:Q.clientLeft||0:0,Y=null!=(L=null==x?void 0:x[y])?L:0,U=I+K-Y,G=Ne(f?ye(N,I+V-Y-X):N,I,f?ve(P,U):P);A[y]=G,k[y]=G-I}if(a){var J,Z="x"===y?zt:Vt,tt="x"===y?Rt:qt,et=A[w],it="y"===w?"height":"width",nt=et+g[Z],st=et-g[tt],ot=-1!==[zt,Vt].indexOf(_),rt=null!=(J=null==x?void 0:x[w])?J:0,at=ot?nt:et-E[it]-T[it]-rt+O.altAxis,lt=ot?et+E[it]+T[it]-rt-O.altAxis:st,ct=f&&ot?function(t,e,i){var n=Ne(t,e,i);return n>i?i:n}(at,et,lt):Ne(f?at:nt,et,f?lt:st);A[w]=ct,k[w]=ct-et}e.modifiersData[n]=k}},requiresIfExists:["offset"]};function di(t,e,i){void 0===i&&(i=!1);var n,s,o=me(e),r=me(e)&&function(t){var e=t.getBoundingClientRect(),i=we(e.width)/t.offsetWidth||1,n=we(e.height)/t.offsetHeight||1;return 1!==i||1!==n}(e),a=Le(e),l=Te(t,r,i),c={scrollLeft:0,scrollTop:0},h={x:0,y:0};return(o||!o&&!i)&&(("body"!==ue(e)||Ue(a))&&(c=(n=e)!==fe(n)&&me(n)?{scrollLeft:(s=n).scrollLeft,scrollTop:s.scrollTop}:Xe(n)),me(e)?((h=Te(e,!0)).x+=e.clientLeft,h.y+=e.clientTop):a&&(h.x=Ye(a))),{x:l.left+c.scrollLeft-h.x,y:l.top+c.scrollTop-h.y,width:l.width,height:l.height}}function ui(t){var e=new Map,i=new Set,n=[];function s(t){i.add(t.name),[].concat(t.requires||[],t.requiresIfExists||[]).forEach((function(t){if(!i.has(t)){var n=e.get(t);n&&s(n)}})),n.push(t)}return t.forEach((function(t){e.set(t.name,t)})),t.forEach((function(t){i.has(t.name)||s(t)})),n}var fi={placement:"bottom",modifiers:[],strategy:"absolute"};function pi(){for(var t=arguments.length,e=new Array(t),i=0;i<t;i++)e[i]=arguments[i];return!e.some((function(t){return!(t&&"function"==typeof t.getBoundingClientRect)}))}function mi(t){void 0===t&&(t={});var e=t,i=e.defaultModifiers,n=void 0===i?[]:i,s=e.defaultOptions,o=void 0===s?fi:s;return function(t,e,i){void 0===i&&(i=o);var s,r,a={placement:"bottom",orderedModifiers:[],options:Object.assign({},fi,o),modifiersData:{},elements:{reference:t,popper:e},attributes:{},styles:{}},l=[],c=!1,h={state:a,setOptions:function(i){var s="function"==typeof i?i(a.options):i;d(),a.options=Object.assign({},o,a.options,s),a.scrollParents={reference:pe(t)?Je(t):t.contextElement?Je(t.contextElement):[],popper:Je(e)};var r,c,u=function(t){var e=ui(t);return de.reduce((function(t,i){return t.concat(e.filter((function(t){return t.phase===i})))}),[])}((r=[].concat(n,a.options.modifiers),c=r.reduce((function(t,e){var i=t[e.name];return t[e.name]=i?Object.assign({},i,e,{options:Object.assign({},i.options,e.options),data:Object.assign({},i.data,e.data)}):e,t}),{}),Object.keys(c).map((function(t){return c[t]}))));return a.orderedModifiers=u.filter((function(t){return t.enabled})),a.orderedModifiers.forEach((function(t){var e=t.name,i=t.options,n=void 0===i?{}:i,s=t.effect;if("function"==typeof s){var o=s({state:a,name:e,instance:h,options:n});l.push(o||function(){})}})),h.update()},forceUpdate:function(){if(!c){var t=a.elements,e=t.reference,i=t.popper;if(pi(e,i)){a.rects={reference:di(e,$e(i),"fixed"===a.options.strategy),popper:Ce(i)},a.reset=!1,a.placement=a.options.placement,a.orderedModifiers.forEach((function(t){return a.modifiersData[t.name]=Object.assign({},t.data)}));for(var n=0;n<a.orderedModifiers.length;n++)if(!0!==a.reset){var s=a.orderedModifiers[n],o=s.fn,r=s.options,l=void 0===r?{}:r,d=s.name;"function"==typeof o&&(a=o({state:a,options:l,name:d,instance:h})||a)}else a.reset=!1,n=-1}}},update:(s=function(){return new Promise((function(t){h.forceUpdate(),t(a)}))},function(){return r||(r=new Promise((function(t){Promise.resolve().then((function(){r=void 0,t(s())}))}))),r}),destroy:function(){d(),c=!0}};if(!pi(t,e))return h;function d(){l.forEach((function(t){return t()})),l=[]}return h.setOptions(i).then((function(t){!c&&i.onFirstUpdate&&i.onFirstUpdate(t)})),h}}var gi=mi(),_i=mi({defaultModifiers:[Re,ci,Be,_e]}),bi=mi({defaultModifiers:[Re,ci,Be,_e,li,si,hi,Me,ai]});const vi=Object.freeze(Object.defineProperty({__proto__:null,afterMain:ae,afterRead:se,afterWrite:he,applyStyles:_e,arrow:Me,auto:Kt,basePlacements:Qt,beforeMain:oe,beforeRead:ie,beforeWrite:le,bottom:Rt,clippingParents:Ut,computeStyles:Be,createPopper:bi,createPopperBase:gi,createPopperLite:_i,detectOverflow:ii,end:Yt,eventListeners:Re,flip:si,hide:ai,left:Vt,main:re,modifierPhases:de,offset:li,placements:ee,popper:Jt,popperGenerator:mi,popperOffsets:ci,preventOverflow:hi,read:ne,reference:Zt,right:qt,start:Xt,top:zt,variationPlacements:te,viewport:Gt,write:ce},Symbol.toStringTag,{value:"Module"})),yi="dropdown",wi=".bs.dropdown",Ai=".data-api",Ei="ArrowUp",Ti="ArrowDown",Ci=`hide${wi}`,Oi=`hidden${wi}`,xi=`show${wi}`,ki=`shown${wi}`,Li=`click${wi}${Ai}`,Si=`keydown${wi}${Ai}`,Di=`keyup${wi}${Ai}`,$i="show",Ii='[data-bs-toggle="dropdown"]:not(.disabled):not(:disabled)',Ni=`${Ii}.${$i}`,Pi=".dropdown-menu",ji=p()?"top-end":"top-start",Mi=p()?"top-start":"top-end",Fi=p()?"bottom-end":"bottom-start",Hi=p()?"bottom-start":"bottom-end",Wi=p()?"left-start":"right-start",Bi=p()?"right-start":"left-start",zi={autoClose:!0,boundary:"clippingParents",display:"dynamic",offset:[0,2],popperConfig:null,reference:"toggle"},Ri={autoClose:"(boolean|string)",boundary:"(string|element)",display:"string",offset:"(array|string|function)",popperConfig:"(null|object|function)",reference:"(string|element|object)"};class qi extends W{constructor(t,e){super(t,e),this._popper=null,this._parent=this._element.parentNode,this._menu=z.next(this._element,Pi)[0]||z.prev(this._element,Pi)[0]||z.findOne(Pi,this._parent),this._inNavbar=this._detectNavbar()}static get Default(){return zi}static get DefaultType(){return Ri}static get NAME(){return yi}toggle(){return this._isShown()?this.hide():this.show()}show(){if(l(this._element)||this._isShown())return;const t={relatedTarget:this._element};if(!N.trigger(this._element,xi,t).defaultPrevented){if(this._createPopper(),"ontouchstart"in document.documentElement&&!this._parent.closest(".navbar-nav"))for(const t of[].concat(...document.body.children))N.on(t,"mouseover",h);this._element.focus(),this._element.setAttribute("aria-expanded",!0),this._menu.classList.add($i),this._element.classList.add($i),N.trigger(this._element,ki,t)}}hide(){if(l(this._element)||!this._isShown())return;const t={relatedTarget:this._element};this._completeHide(t)}dispose(){this._popper&&this._popper.destroy(),super.dispose()}update(){this._inNavbar=this._detectNavbar(),this._popper&&this._popper.update()}_completeHide(t){if(!N.trigger(this._element,Ci,t).defaultPrevented){if("ontouchstart"in document.documentElement)for(const t of[].concat(...document.body.children))N.off(t,"mouseover",h);this._popper&&this._popper.destroy(),this._menu.classList.remove($i),this._element.classList.remove($i),this._element.setAttribute("aria-expanded","false"),F.removeDataAttribute(this._menu,"popper"),N.trigger(this._element,Oi,t)}}_getConfig(t){if("object"==typeof(t=super._getConfig(t)).reference&&!o(t.reference)&&"function"!=typeof t.reference.getBoundingClientRect)throw new TypeError(`${yi.toUpperCase()}: Option "reference" provided type "object" without a required "getBoundingClientRect" method.`);return t}_createPopper(){if(void 0===vi)throw new TypeError("Bootstrap's dropdowns require Popper (https://popper.js.org)");let t=this._element;"parent"===this._config.reference?t=this._parent:o(this._config.reference)?t=r(this._config.reference):"object"==typeof this._config.reference&&(t=this._config.reference);const e=this._getPopperConfig();this._popper=bi(t,this._menu,e)}_isShown(){return this._menu.classList.contains($i)}_getPlacement(){const t=this._parent;if(t.classList.contains("dropend"))return Wi;if(t.classList.contains("dropstart"))return Bi;if(t.classList.contains("dropup-center"))return"top";if(t.classList.contains("dropdown-center"))return"bottom";const e="end"===getComputedStyle(this._menu).getPropertyValue("--bs-position").trim();return t.classList.contains("dropup")?e?Mi:ji:e?Hi:Fi}_detectNavbar(){return null!==this._element.closest(".navbar")}_getOffset(){const{offset:t}=this._config;return"string"==typeof t?t.split(",").map((t=>Number.parseInt(t,10))):"function"==typeof t?e=>t(e,this._element):t}_getPopperConfig(){const t={placement:this._getPlacement(),modifiers:[{name:"preventOverflow",options:{boundary:this._config.boundary}},{name:"offset",options:{offset:this._getOffset()}}]};return(this._inNavbar||"static"===this._config.display)&&(F.setDataAttribute(this._menu,"popper","static"),t.modifiers=[{name:"applyStyles",enabled:!1}]),{...t,...g(this._config.popperConfig,[t])}}_selectMenuItem({key:t,target:e}){const i=z.find(".dropdown-menu .dropdown-item:not(.disabled):not(:disabled)",this._menu).filter((t=>a(t)));i.length&&b(i,e,t===Ti,!i.includes(e)).focus()}static jQueryInterface(t){return this.each((function(){const e=qi.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t])throw new TypeError(`No method named "${t}"`);e[t]()}}))}static clearMenus(t){if(2===t.button||"keyup"===t.type&&"Tab"!==t.key)return;const e=z.find(Ni);for(const i of e){const e=qi.getInstance(i);if(!e||!1===e._config.autoClose)continue;const n=t.composedPath(),s=n.includes(e._menu);if(n.includes(e._element)||"inside"===e._config.autoClose&&!s||"outside"===e._config.autoClose&&s)continue;if(e._menu.contains(t.target)&&("keyup"===t.type&&"Tab"===t.key||/input|select|option|textarea|form/i.test(t.target.tagName)))continue;const o={relatedTarget:e._element};"click"===t.type&&(o.clickEvent=t),e._completeHide(o)}}static dataApiKeydownHandler(t){const e=/input|textarea/i.test(t.target.tagName),i="Escape"===t.key,n=[Ei,Ti].includes(t.key);if(!n&&!i)return;if(e&&!i)return;t.preventDefault();const s=this.matches(Ii)?this:z.prev(this,Ii)[0]||z.next(this,Ii)[0]||z.findOne(Ii,t.delegateTarget.parentNode),o=qi.getOrCreateInstance(s);if(n)return t.stopPropagation(),o.show(),void o._selectMenuItem(t);o._isShown()&&(t.stopPropagation(),o.hide(),s.focus())}}N.on(document,Si,Ii,qi.dataApiKeydownHandler),N.on(document,Si,Pi,qi.dataApiKeydownHandler),N.on(document,Li,qi.clearMenus),N.on(document,Di,qi.clearMenus),N.on(document,Li,Ii,(function(t){t.preventDefault(),qi.getOrCreateInstance(this).toggle()})),m(qi);const Vi="backdrop",Ki="show",Qi=`mousedown.bs.${Vi}`,Xi={className:"modal-backdrop",clickCallback:null,isAnimated:!1,isVisible:!0,rootElement:"body"},Yi={className:"string",clickCallback:"(function|null)",isAnimated:"boolean",isVisible:"boolean",rootElement:"(element|string)"};class Ui extends H{constructor(t){super(),this._config=this._getConfig(t),this._isAppended=!1,this._element=null}static get Default(){return Xi}static get DefaultType(){return Yi}static get NAME(){return Vi}show(t){if(!this._config.isVisible)return void g(t);this._append();const e=this._getElement();this._config.isAnimated&&d(e),e.classList.add(Ki),this._emulateAnimation((()=>{g(t)}))}hide(t){this._config.isVisible?(this._getElement().classList.remove(Ki),this._emulateAnimation((()=>{this.dispose(),g(t)}))):g(t)}dispose(){this._isAppended&&(N.off(this._element,Qi),this._element.remove(),this._isAppended=!1)}_getElement(){if(!this._element){const t=document.createElement("div");t.className=this._config.className,this._config.isAnimated&&t.classList.add("fade"),this._element=t}return this._element}_configAfterMerge(t){return t.rootElement=r(t.rootElement),t}_append(){if(this._isAppended)return;const t=this._getElement();this._config.rootElement.append(t),N.on(t,Qi,(()=>{g(this._config.clickCallback)})),this._isAppended=!0}_emulateAnimation(t){_(t,this._getElement(),this._config.isAnimated)}}const Gi=".bs.focustrap",Ji=`focusin${Gi}`,Zi=`keydown.tab${Gi}`,tn="backward",en={autofocus:!0,trapElement:null},nn={autofocus:"boolean",trapElement:"element"};class sn extends H{constructor(t){super(),this._config=this._getConfig(t),this._isActive=!1,this._lastTabNavDirection=null}static get Default(){return en}static get DefaultType(){return nn}static get NAME(){return"focustrap"}activate(){this._isActive||(this._config.autofocus&&this._config.trapElement.focus(),N.off(document,Gi),N.on(document,Ji,(t=>this._handleFocusin(t))),N.on(document,Zi,(t=>this._handleKeydown(t))),this._isActive=!0)}deactivate(){this._isActive&&(this._isActive=!1,N.off(document,Gi))}_handleFocusin(t){const{trapElement:e}=this._config;if(t.target===document||t.target===e||e.contains(t.target))return;const i=z.focusableChildren(e);0===i.length?e.focus():this._lastTabNavDirection===tn?i[i.length-1].focus():i[0].focus()}_handleKeydown(t){"Tab"===t.key&&(this._lastTabNavDirection=t.shiftKey?tn:"forward")}}const on=".fixed-top, .fixed-bottom, .is-fixed, .sticky-top",rn=".sticky-top",an="padding-right",ln="margin-right";class cn{constructor(){this._element=document.body}getWidth(){const t=document.documentElement.clientWidth;return Math.abs(window.innerWidth-t)}hide(){const t=this.getWidth();this._disableOverFlow(),this._setElementAttributes(this._element,an,(e=>e+t)),this._setElementAttributes(on,an,(e=>e+t)),this._setElementAttributes(rn,ln,(e=>e-t))}reset(){this._resetElementAttributes(this._element,"overflow"),this._resetElementAttributes(this._element,an),this._resetElementAttributes(on,an),this._resetElementAttributes(rn,ln)}isOverflowing(){return this.getWidth()>0}_disableOverFlow(){this._saveInitialAttribute(this._element,"overflow"),this._element.style.overflow="hidden"}_setElementAttributes(t,e,i){const n=this.getWidth();this._applyManipulationCallback(t,(t=>{if(t!==this._element&&window.innerWidth>t.clientWidth+n)return;this._saveInitialAttribute(t,e);const s=window.getComputedStyle(t).getPropertyValue(e);t.style.setProperty(e,`${i(Number.parseFloat(s))}px`)}))}_saveInitialAttribute(t,e){const i=t.style.getPropertyValue(e);i&&F.setDataAttribute(t,e,i)}_resetElementAttributes(t,e){this._applyManipulationCallback(t,(t=>{const i=F.getDataAttribute(t,e);null!==i?(F.removeDataAttribute(t,e),t.style.setProperty(e,i)):t.style.removeProperty(e)}))}_applyManipulationCallback(t,e){if(o(t))e(t);else for(const i of z.find(t,this._element))e(i)}}const hn=".bs.modal",dn=`hide${hn}`,un=`hidePrevented${hn}`,fn=`hidden${hn}`,pn=`show${hn}`,mn=`shown${hn}`,gn=`resize${hn}`,_n=`click.dismiss${hn}`,bn=`mousedown.dismiss${hn}`,vn=`keydown.dismiss${hn}`,yn=`click${hn}.data-api`,wn="modal-open",An="show",En="modal-static",Tn={backdrop:!0,focus:!0,keyboard:!0},Cn={backdrop:"(boolean|string)",focus:"boolean",keyboard:"boolean"};class On extends W{constructor(t,e){super(t,e),this._dialog=z.findOne(".modal-dialog",this._element),this._backdrop=this._initializeBackDrop(),this._focustrap=this._initializeFocusTrap(),this._isShown=!1,this._isTransitioning=!1,this._scrollBar=new cn,this._addEventListeners()}static get Default(){return Tn}static get DefaultType(){return Cn}static get NAME(){return"modal"}toggle(t){return this._isShown?this.hide():this.show(t)}show(t){this._isShown||this._isTransitioning||N.trigger(this._element,pn,{relatedTarget:t}).defaultPrevented||(this._isShown=!0,this._isTransitioning=!0,this._scrollBar.hide(),document.body.classList.add(wn),this._adjustDialog(),this._backdrop.show((()=>this._showElement(t))))}hide(){this._isShown&&!this._isTransitioning&&(N.trigger(this._element,dn).defaultPrevented||(this._isShown=!1,this._isTransitioning=!0,this._focustrap.deactivate(),this._element.classList.remove(An),this._queueCallback((()=>this._hideModal()),this._element,this._isAnimated())))}dispose(){N.off(window,hn),N.off(this._dialog,hn),this._backdrop.dispose(),this._focustrap.deactivate(),super.dispose()}handleUpdate(){this._adjustDialog()}_initializeBackDrop(){return new Ui({isVisible:Boolean(this._config.backdrop),isAnimated:this._isAnimated()})}_initializeFocusTrap(){return new sn({trapElement:this._element})}_showElement(t){document.body.contains(this._element)||document.body.append(this._element),this._element.style.display="block",this._element.removeAttribute("aria-hidden"),this._element.setAttribute("aria-modal",!0),this._element.setAttribute("role","dialog"),this._element.scrollTop=0;const e=z.findOne(".modal-body",this._dialog);e&&(e.scrollTop=0),d(this._element),this._element.classList.add(An),this._queueCallback((()=>{this._config.focus&&this._focustrap.activate(),this._isTransitioning=!1,N.trigger(this._element,mn,{relatedTarget:t})}),this._dialog,this._isAnimated())}_addEventListeners(){N.on(this._element,vn,(t=>{"Escape"===t.key&&(this._config.keyboard?this.hide():this._triggerBackdropTransition())})),N.on(window,gn,(()=>{this._isShown&&!this._isTransitioning&&this._adjustDialog()})),N.on(this._element,bn,(t=>{N.one(this._element,_n,(e=>{this._element===t.target&&this._element===e.target&&("static"!==this._config.backdrop?this._config.backdrop&&this.hide():this._triggerBackdropTransition())}))}))}_hideModal(){this._element.style.display="none",this._element.setAttribute("aria-hidden",!0),this._element.removeAttribute("aria-modal"),this._element.removeAttribute("role"),this._isTransitioning=!1,this._backdrop.hide((()=>{document.body.classList.remove(wn),this._resetAdjustments(),this._scrollBar.reset(),N.trigger(this._element,fn)}))}_isAnimated(){return this._element.classList.contains("fade")}_triggerBackdropTransition(){if(N.trigger(this._element,un).defaultPrevented)return;const t=this._element.scrollHeight>document.documentElement.clientHeight,e=this._element.style.overflowY;"hidden"===e||this._element.classList.contains(En)||(t||(this._element.style.overflowY="hidden"),this._element.classList.add(En),this._queueCallback((()=>{this._element.classList.remove(En),this._queueCallback((()=>{this._element.style.overflowY=e}),this._dialog)}),this._dialog),this._element.focus())}_adjustDialog(){const t=this._element.scrollHeight>document.documentElement.clientHeight,e=this._scrollBar.getWidth(),i=e>0;if(i&&!t){const t=p()?"paddingLeft":"paddingRight";this._element.style[t]=`${e}px`}if(!i&&t){const t=p()?"paddingRight":"paddingLeft";this._element.style[t]=`${e}px`}}_resetAdjustments(){this._element.style.paddingLeft="",this._element.style.paddingRight=""}static jQueryInterface(t,e){return this.each((function(){const i=On.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===i[t])throw new TypeError(`No method named "${t}"`);i[t](e)}}))}}N.on(document,yn,'[data-bs-toggle="modal"]',(function(t){const e=z.getElementFromSelector(this);["A","AREA"].includes(this.tagName)&&t.preventDefault(),N.one(e,pn,(t=>{t.defaultPrevented||N.one(e,fn,(()=>{a(this)&&this.focus()}))}));const i=z.findOne(".modal.show");i&&On.getInstance(i).hide(),On.getOrCreateInstance(e).toggle(this)})),R(On),m(On);const xn=".bs.offcanvas",kn=".data-api",Ln=`load${xn}${kn}`,Sn="show",Dn="showing",$n="hiding",In=".offcanvas.show",Nn=`show${xn}`,Pn=`shown${xn}`,jn=`hide${xn}`,Mn=`hidePrevented${xn}`,Fn=`hidden${xn}`,Hn=`resize${xn}`,Wn=`click${xn}${kn}`,Bn=`keydown.dismiss${xn}`,zn={backdrop:!0,keyboard:!0,scroll:!1},Rn={backdrop:"(boolean|string)",keyboard:"boolean",scroll:"boolean"};class qn extends W{constructor(t,e){super(t,e),this._isShown=!1,this._backdrop=this._initializeBackDrop(),this._focustrap=this._initializeFocusTrap(),this._addEventListeners()}static get Default(){return zn}static get DefaultType(){return Rn}static get NAME(){return"offcanvas"}toggle(t){return this._isShown?this.hide():this.show(t)}show(t){this._isShown||N.trigger(this._element,Nn,{relatedTarget:t}).defaultPrevented||(this._isShown=!0,this._backdrop.show(),this._config.scroll||(new cn).hide(),this._element.setAttribute("aria-modal",!0),this._element.setAttribute("role","dialog"),this._element.classList.add(Dn),this._queueCallback((()=>{this._config.scroll&&!this._config.backdrop||this._focustrap.activate(),this._element.classList.add(Sn),this._element.classList.remove(Dn),N.trigger(this._element,Pn,{relatedTarget:t})}),this._element,!0))}hide(){this._isShown&&(N.trigger(this._element,jn).defaultPrevented||(this._focustrap.deactivate(),this._element.blur(),this._isShown=!1,this._element.classList.add($n),this._backdrop.hide(),this._queueCallback((()=>{this._element.classList.remove(Sn,$n),this._element.removeAttribute("aria-modal"),this._element.removeAttribute("role"),this._config.scroll||(new cn).reset(),N.trigger(this._element,Fn)}),this._element,!0)))}dispose(){this._backdrop.dispose(),this._focustrap.deactivate(),super.dispose()}_initializeBackDrop(){const t=Boolean(this._config.backdrop);return new Ui({className:"offcanvas-backdrop",isVisible:t,isAnimated:!0,rootElement:this._element.parentNode,clickCallback:t?()=>{"static"!==this._config.backdrop?this.hide():N.trigger(this._element,Mn)}:null})}_initializeFocusTrap(){return new sn({trapElement:this._element})}_addEventListeners(){N.on(this._element,Bn,(t=>{"Escape"===t.key&&(this._config.keyboard?this.hide():N.trigger(this._element,Mn))}))}static jQueryInterface(t){return this.each((function(){const e=qn.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t]||t.startsWith("_")||"constructor"===t)throw new TypeError(`No method named "${t}"`);e[t](this)}}))}}N.on(document,Wn,'[data-bs-toggle="offcanvas"]',(function(t){const e=z.getElementFromSelector(this);if(["A","AREA"].includes(this.tagName)&&t.preventDefault(),l(this))return;N.one(e,Fn,(()=>{a(this)&&this.focus()}));const i=z.findOne(In);i&&i!==e&&qn.getInstance(i).hide(),qn.getOrCreateInstance(e).toggle(this)})),N.on(window,Ln,(()=>{for(const t of z.find(In))qn.getOrCreateInstance(t).show()})),N.on(window,Hn,(()=>{for(const t of z.find("[aria-modal][class*=show][class*=offcanvas-]"))"fixed"!==getComputedStyle(t).position&&qn.getOrCreateInstance(t).hide()})),R(qn),m(qn);const Vn={"*":["class","dir","id","lang","role",/^aria-[\w-]*$/i],a:["target","href","title","rel"],area:[],b:[],br:[],col:[],code:[],dd:[],div:[],dl:[],dt:[],em:[],hr:[],h1:[],h2:[],h3:[],h4:[],h5:[],h6:[],i:[],img:["src","srcset","alt","title","width","height"],li:[],ol:[],p:[],pre:[],s:[],small:[],span:[],sub:[],sup:[],strong:[],u:[],ul:[]},Kn=new Set(["background","cite","href","itemtype","longdesc","poster","src","xlink:href"]),Qn=/^(?!javascript:)(?:[a-z0-9+.-]+:|[^&:/?#]*(?:[/?#]|$))/i,Xn=(t,e)=>{const i=t.nodeName.toLowerCase();return e.includes(i)?!Kn.has(i)||Boolean(Qn.test(t.nodeValue)):e.filter((t=>t instanceof RegExp)).some((t=>t.test(i)))},Yn={allowList:Vn,content:{},extraClass:"",html:!1,sanitize:!0,sanitizeFn:null,template:"<div></div>"},Un={allowList:"object",content:"object",extraClass:"(string|function)",html:"boolean",sanitize:"boolean",sanitizeFn:"(null|function)",template:"string"},Gn={entry:"(string|element|function|null)",selector:"(string|element)"};class Jn extends H{constructor(t){super(),this._config=this._getConfig(t)}static get Default(){return Yn}static get DefaultType(){return Un}static get NAME(){return"TemplateFactory"}getContent(){return Object.values(this._config.content).map((t=>this._resolvePossibleFunction(t))).filter(Boolean)}hasContent(){return this.getContent().length>0}changeContent(t){return this._checkContent(t),this._config.content={...this._config.content,...t},this}toHtml(){const t=document.createElement("div");t.innerHTML=this._maybeSanitize(this._config.template);for(const[e,i]of Object.entries(this._config.content))this._setContent(t,i,e);const e=t.children[0],i=this._resolvePossibleFunction(this._config.extraClass);return i&&e.classList.add(...i.split(" ")),e}_typeCheckConfig(t){super._typeCheckConfig(t),this._checkContent(t.content)}_checkContent(t){for(const[e,i]of Object.entries(t))super._typeCheckConfig({selector:e,entry:i},Gn)}_setContent(t,e,i){const n=z.findOne(i,t);n&&((e=this._resolvePossibleFunction(e))?o(e)?this._putElementInTemplate(r(e),n):this._config.html?n.innerHTML=this._maybeSanitize(e):n.textContent=e:n.remove())}_maybeSanitize(t){return this._config.sanitize?function(t,e,i){if(!t.length)return t;if(i&&"function"==typeof i)return i(t);const n=(new window.DOMParser).parseFromString(t,"text/html"),s=[].concat(...n.body.querySelectorAll("*"));for(const t of s){const i=t.nodeName.toLowerCase();if(!Object.keys(e).includes(i)){t.remove();continue}const n=[].concat(...t.attributes),s=[].concat(e["*"]||[],e[i]||[]);for(const e of n)Xn(e,s)||t.removeAttribute(e.nodeName)}return n.body.innerHTML}(t,this._config.allowList,this._config.sanitizeFn):t}_resolvePossibleFunction(t){return g(t,[this])}_putElementInTemplate(t,e){if(this._config.html)return e.innerHTML="",void e.append(t);e.textContent=t.textContent}}const Zn=new Set(["sanitize","allowList","sanitizeFn"]),ts="fade",es="show",is=".modal",ns="hide.bs.modal",ss="hover",os="focus",rs={AUTO:"auto",TOP:"top",RIGHT:p()?"left":"right",BOTTOM:"bottom",LEFT:p()?"right":"left"},as={allowList:Vn,animation:!0,boundary:"clippingParents",container:!1,customClass:"",delay:0,fallbackPlacements:["top","right","bottom","left"],html:!1,offset:[0,6],placement:"top",popperConfig:null,sanitize:!0,sanitizeFn:null,selector:!1,template:'<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',title:"",trigger:"hover focus"},ls={allowList:"object",animation:"boolean",boundary:"(string|element)",container:"(string|element|boolean)",customClass:"(string|function)",delay:"(number|object)",fallbackPlacements:"array",html:"boolean",offset:"(array|string|function)",placement:"(string|function)",popperConfig:"(null|object|function)",sanitize:"boolean",sanitizeFn:"(null|function)",selector:"(string|boolean)",template:"string",title:"(string|element|function)",trigger:"string"};class cs extends W{constructor(t,e){if(void 0===vi)throw new TypeError("Bootstrap's tooltips require Popper (https://popper.js.org)");super(t,e),this._isEnabled=!0,this._timeout=0,this._isHovered=null,this._activeTrigger={},this._popper=null,this._templateFactory=null,this._newContent=null,this.tip=null,this._setListeners(),this._config.selector||this._fixTitle()}static get Default(){return as}static get DefaultType(){return ls}static get NAME(){return"tooltip"}enable(){this._isEnabled=!0}disable(){this._isEnabled=!1}toggleEnabled(){this._isEnabled=!this._isEnabled}toggle(){this._isEnabled&&(this._activeTrigger.click=!this._activeTrigger.click,this._isShown()?this._leave():this._enter())}dispose(){clearTimeout(this._timeout),N.off(this._element.closest(is),ns,this._hideModalHandler),this._element.getAttribute("data-bs-original-title")&&this._element.setAttribute("title",this._element.getAttribute("data-bs-original-title")),this._disposePopper(),super.dispose()}show(){if("none"===this._element.style.display)throw new Error("Please use show on visible elements");if(!this._isWithContent()||!this._isEnabled)return;const t=N.trigger(this._element,this.constructor.eventName("show")),e=(c(this._element)||this._element.ownerDocument.documentElement).contains(this._element);if(t.defaultPrevented||!e)return;this._disposePopper();const i=this._getTipElement();this._element.setAttribute("aria-describedby",i.getAttribute("id"));const{container:n}=this._config;if(this._element.ownerDocument.documentElement.contains(this.tip)||(n.append(i),N.trigger(this._element,this.constructor.eventName("inserted"))),this._popper=this._createPopper(i),i.classList.add(es),"ontouchstart"in document.documentElement)for(const t of[].concat(...document.body.children))N.on(t,"mouseover",h);this._queueCallback((()=>{N.trigger(this._element,this.constructor.eventName("shown")),!1===this._isHovered&&this._leave(),this._isHovered=!1}),this.tip,this._isAnimated())}hide(){if(this._isShown()&&!N.trigger(this._element,this.constructor.eventName("hide")).defaultPrevented){if(this._getTipElement().classList.remove(es),"ontouchstart"in document.documentElement)for(const t of[].concat(...document.body.children))N.off(t,"mouseover",h);this._activeTrigger.click=!1,this._activeTrigger[os]=!1,this._activeTrigger[ss]=!1,this._isHovered=null,this._queueCallback((()=>{this._isWithActiveTrigger()||(this._isHovered||this._disposePopper(),this._element.removeAttribute("aria-describedby"),N.trigger(this._element,this.constructor.eventName("hidden")))}),this.tip,this._isAnimated())}}update(){this._popper&&this._popper.update()}_isWithContent(){return Boolean(this._getTitle())}_getTipElement(){return this.tip||(this.tip=this._createTipElement(this._newContent||this._getContentForTemplate())),this.tip}_createTipElement(t){const e=this._getTemplateFactory(t).toHtml();if(!e)return null;e.classList.remove(ts,es),e.classList.add(`bs-${this.constructor.NAME}-auto`);const i=(t=>{do{t+=Math.floor(1e6*Math.random())}while(document.getElementById(t));return t})(this.constructor.NAME).toString();return e.setAttribute("id",i),this._isAnimated()&&e.classList.add(ts),e}setContent(t){this._newContent=t,this._isShown()&&(this._disposePopper(),this.show())}_getTemplateFactory(t){return this._templateFactory?this._templateFactory.changeContent(t):this._templateFactory=new Jn({...this._config,content:t,extraClass:this._resolvePossibleFunction(this._config.customClass)}),this._templateFactory}_getContentForTemplate(){return{".tooltip-inner":this._getTitle()}}_getTitle(){return this._resolvePossibleFunction(this._config.title)||this._element.getAttribute("data-bs-original-title")}_initializeOnDelegatedTarget(t){return this.constructor.getOrCreateInstance(t.delegateTarget,this._getDelegateConfig())}_isAnimated(){return this._config.animation||this.tip&&this.tip.classList.contains(ts)}_isShown(){return this.tip&&this.tip.classList.contains(es)}_createPopper(t){const e=g(this._config.placement,[this,t,this._element]),i=rs[e.toUpperCase()];return bi(this._element,t,this._getPopperConfig(i))}_getOffset(){const{offset:t}=this._config;return"string"==typeof t?t.split(",").map((t=>Number.parseInt(t,10))):"function"==typeof t?e=>t(e,this._element):t}_resolvePossibleFunction(t){return g(t,[this._element])}_getPopperConfig(t){const e={placement:t,modifiers:[{name:"flip",options:{fallbackPlacements:this._config.fallbackPlacements}},{name:"offset",options:{offset:this._getOffset()}},{name:"preventOverflow",options:{boundary:this._config.boundary}},{name:"arrow",options:{element:`.${this.constructor.NAME}-arrow`}},{name:"preSetPlacement",enabled:!0,phase:"beforeMain",fn:t=>{this._getTipElement().setAttribute("data-popper-placement",t.state.placement)}}]};return{...e,...g(this._config.popperConfig,[e])}}_setListeners(){const t=this._config.trigger.split(" ");for(const e of t)if("click"===e)N.on(this._element,this.constructor.eventName("click"),this._config.selector,(t=>{this._initializeOnDelegatedTarget(t).toggle()}));else if("manual"!==e){const t=e===ss?this.constructor.eventName("mouseenter"):this.constructor.eventName("focusin"),i=e===ss?this.constructor.eventName("mouseleave"):this.constructor.eventName("focusout");N.on(this._element,t,this._config.selector,(t=>{const e=this._initializeOnDelegatedTarget(t);e._activeTrigger["focusin"===t.type?os:ss]=!0,e._enter()})),N.on(this._element,i,this._config.selector,(t=>{const e=this._initializeOnDelegatedTarget(t);e._activeTrigger["focusout"===t.type?os:ss]=e._element.contains(t.relatedTarget),e._leave()}))}this._hideModalHandler=()=>{this._element&&this.hide()},N.on(this._element.closest(is),ns,this._hideModalHandler)}_fixTitle(){const t=this._element.getAttribute("title");t&&(this._element.getAttribute("aria-label")||this._element.textContent.trim()||this._element.setAttribute("aria-label",t),this._element.setAttribute("data-bs-original-title",t),this._element.removeAttribute("title"))}_enter(){this._isShown()||this._isHovered?this._isHovered=!0:(this._isHovered=!0,this._setTimeout((()=>{this._isHovered&&this.show()}),this._config.delay.show))}_leave(){this._isWithActiveTrigger()||(this._isHovered=!1,this._setTimeout((()=>{this._isHovered||this.hide()}),this._config.delay.hide))}_setTimeout(t,e){clearTimeout(this._timeout),this._timeout=setTimeout(t,e)}_isWithActiveTrigger(){return Object.values(this._activeTrigger).includes(!0)}_getConfig(t){const e=F.getDataAttributes(this._element);for(const t of Object.keys(e))Zn.has(t)&&delete e[t];return t={...e,..."object"==typeof t&&t?t:{}},t=this._mergeConfigObj(t),t=this._configAfterMerge(t),this._typeCheckConfig(t),t}_configAfterMerge(t){return t.container=!1===t.container?document.body:r(t.container),"number"==typeof t.delay&&(t.delay={show:t.delay,hide:t.delay}),"number"==typeof t.title&&(t.title=t.title.toString()),"number"==typeof t.content&&(t.content=t.content.toString()),t}_getDelegateConfig(){const t={};for(const[e,i]of Object.entries(this._config))this.constructor.Default[e]!==i&&(t[e]=i);return t.selector=!1,t.trigger="manual",t}_disposePopper(){this._popper&&(this._popper.destroy(),this._popper=null),this.tip&&(this.tip.remove(),this.tip=null)}static jQueryInterface(t){return this.each((function(){const e=cs.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t])throw new TypeError(`No method named "${t}"`);e[t]()}}))}}m(cs);const hs={...cs.Default,content:"",offset:[0,8],placement:"right",template:'<div class="popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',trigger:"click"},ds={...cs.DefaultType,content:"(null|string|element|function)"};class us extends cs{static get Default(){return hs}static get DefaultType(){return ds}static get NAME(){return"popover"}_isWithContent(){return this._getTitle()||this._getContent()}_getContentForTemplate(){return{".popover-header":this._getTitle(),".popover-body":this._getContent()}}_getContent(){return this._resolvePossibleFunction(this._config.content)}static jQueryInterface(t){return this.each((function(){const e=us.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t])throw new TypeError(`No method named "${t}"`);e[t]()}}))}}m(us);const fs=".bs.scrollspy",ps=`activate${fs}`,ms=`click${fs}`,gs=`load${fs}.data-api`,_s="active",bs="[href]",vs=".nav-link",ys=`${vs}, .nav-item > ${vs}, .list-group-item`,ws={offset:null,rootMargin:"0px 0px -25%",smoothScroll:!1,target:null,threshold:[.1,.5,1]},As={offset:"(number|null)",rootMargin:"string",smoothScroll:"boolean",target:"element",threshold:"array"};class Es extends W{constructor(t,e){super(t,e),this._targetLinks=new Map,this._observableSections=new Map,this._rootElement="visible"===getComputedStyle(this._element).overflowY?null:this._element,this._activeTarget=null,this._observer=null,this._previousScrollData={visibleEntryTop:0,parentScrollTop:0},this.refresh()}static get Default(){return ws}static get DefaultType(){return As}static get NAME(){return"scrollspy"}refresh(){this._initializeTargetsAndObservables(),this._maybeEnableSmoothScroll(),this._observer?this._observer.disconnect():this._observer=this._getNewObserver();for(const t of this._observableSections.values())this._observer.observe(t)}dispose(){this._observer.disconnect(),super.dispose()}_configAfterMerge(t){return t.target=r(t.target)||document.body,t.rootMargin=t.offset?`${t.offset}px 0px -30%`:t.rootMargin,"string"==typeof t.threshold&&(t.threshold=t.threshold.split(",").map((t=>Number.parseFloat(t)))),t}_maybeEnableSmoothScroll(){this._config.smoothScroll&&(N.off(this._config.target,ms),N.on(this._config.target,ms,bs,(t=>{const e=this._observableSections.get(t.target.hash);if(e){t.preventDefault();const i=this._rootElement||window,n=e.offsetTop-this._element.offsetTop;if(i.scrollTo)return void i.scrollTo({top:n,behavior:"smooth"});i.scrollTop=n}})))}_getNewObserver(){const t={root:this._rootElement,threshold:this._config.threshold,rootMargin:this._config.rootMargin};return new IntersectionObserver((t=>this._observerCallback(t)),t)}_observerCallback(t){const e=t=>this._targetLinks.get(`#${t.target.id}`),i=t=>{this._previousScrollData.visibleEntryTop=t.target.offsetTop,this._process(e(t))},n=(this._rootElement||document.documentElement).scrollTop,s=n>=this._previousScrollData.parentScrollTop;this._previousScrollData.parentScrollTop=n;for(const o of t){if(!o.isIntersecting){this._activeTarget=null,this._clearActiveClass(e(o));continue}const t=o.target.offsetTop>=this._previousScrollData.visibleEntryTop;if(s&&t){if(i(o),!n)return}else s||t||i(o)}}_initializeTargetsAndObservables(){this._targetLinks=new Map,this._observableSections=new Map;const t=z.find(bs,this._config.target);for(const e of t){if(!e.hash||l(e))continue;const t=z.findOne(decodeURI(e.hash),this._element);a(t)&&(this._targetLinks.set(decodeURI(e.hash),e),this._observableSections.set(e.hash,t))}}_process(t){this._activeTarget!==t&&(this._clearActiveClass(this._config.target),this._activeTarget=t,t.classList.add(_s),this._activateParents(t),N.trigger(this._element,ps,{relatedTarget:t}))}_activateParents(t){if(t.classList.contains("dropdown-item"))z.findOne(".dropdown-toggle",t.closest(".dropdown")).classList.add(_s);else for(const e of z.parents(t,".nav, .list-group"))for(const t of z.prev(e,ys))t.classList.add(_s)}_clearActiveClass(t){t.classList.remove(_s);const e=z.find(`${bs}.${_s}`,t);for(const t of e)t.classList.remove(_s)}static jQueryInterface(t){return this.each((function(){const e=Es.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t]||t.startsWith("_")||"constructor"===t)throw new TypeError(`No method named "${t}"`);e[t]()}}))}}N.on(window,gs,(()=>{for(const t of z.find('[data-bs-spy="scroll"]'))Es.getOrCreateInstance(t)})),m(Es);const Ts=".bs.tab",Cs=`hide${Ts}`,Os=`hidden${Ts}`,xs=`show${Ts}`,ks=`shown${Ts}`,Ls=`click${Ts}`,Ss=`keydown${Ts}`,Ds=`load${Ts}`,$s="ArrowLeft",Is="ArrowRight",Ns="ArrowUp",Ps="ArrowDown",js="Home",Ms="End",Fs="active",Hs="fade",Ws="show",Bs=".dropdown-toggle",zs=`:not(${Bs})`,Rs='[data-bs-toggle="tab"], [data-bs-toggle="pill"], [data-bs-toggle="list"]',qs=`.nav-link${zs}, .list-group-item${zs}, [role="tab"]${zs}, ${Rs}`,Vs=`.${Fs}[data-bs-toggle="tab"], .${Fs}[data-bs-toggle="pill"], .${Fs}[data-bs-toggle="list"]`;class Ks extends W{constructor(t){super(t),this._parent=this._element.closest('.list-group, .nav, [role="tablist"]'),this._parent&&(this._setInitialAttributes(this._parent,this._getChildren()),N.on(this._element,Ss,(t=>this._keydown(t))))}static get NAME(){return"tab"}show(){const t=this._element;if(this._elemIsActive(t))return;const e=this._getActiveElem(),i=e?N.trigger(e,Cs,{relatedTarget:t}):null;N.trigger(t,xs,{relatedTarget:e}).defaultPrevented||i&&i.defaultPrevented||(this._deactivate(e,t),this._activate(t,e))}_activate(t,e){t&&(t.classList.add(Fs),this._activate(z.getElementFromSelector(t)),this._queueCallback((()=>{"tab"===t.getAttribute("role")?(t.removeAttribute("tabindex"),t.setAttribute("aria-selected",!0),this._toggleDropDown(t,!0),N.trigger(t,ks,{relatedTarget:e})):t.classList.add(Ws)}),t,t.classList.contains(Hs)))}_deactivate(t,e){t&&(t.classList.remove(Fs),t.blur(),this._deactivate(z.getElementFromSelector(t)),this._queueCallback((()=>{"tab"===t.getAttribute("role")?(t.setAttribute("aria-selected",!1),t.setAttribute("tabindex","-1"),this._toggleDropDown(t,!1),N.trigger(t,Os,{relatedTarget:e})):t.classList.remove(Ws)}),t,t.classList.contains(Hs)))}_keydown(t){if(![$s,Is,Ns,Ps,js,Ms].includes(t.key))return;t.stopPropagation(),t.preventDefault();const e=this._getChildren().filter((t=>!l(t)));let i;if([js,Ms].includes(t.key))i=e[t.key===js?0:e.length-1];else{const n=[Is,Ps].includes(t.key);i=b(e,t.target,n,!0)}i&&(i.focus({preventScroll:!0}),Ks.getOrCreateInstance(i).show())}_getChildren(){return z.find(qs,this._parent)}_getActiveElem(){return this._getChildren().find((t=>this._elemIsActive(t)))||null}_setInitialAttributes(t,e){this._setAttributeIfNotExists(t,"role","tablist");for(const t of e)this._setInitialAttributesOnChild(t)}_setInitialAttributesOnChild(t){t=this._getInnerElement(t);const e=this._elemIsActive(t),i=this._getOuterElement(t);t.setAttribute("aria-selected",e),i!==t&&this._setAttributeIfNotExists(i,"role","presentation"),e||t.setAttribute("tabindex","-1"),this._setAttributeIfNotExists(t,"role","tab"),this._setInitialAttributesOnTargetPanel(t)}_setInitialAttributesOnTargetPanel(t){const e=z.getElementFromSelector(t);e&&(this._setAttributeIfNotExists(e,"role","tabpanel"),t.id&&this._setAttributeIfNotExists(e,"aria-labelledby",`${t.id}`))}_toggleDropDown(t,e){const i=this._getOuterElement(t);if(!i.classList.contains("dropdown"))return;const n=(t,n)=>{const s=z.findOne(t,i);s&&s.classList.toggle(n,e)};n(Bs,Fs),n(".dropdown-menu",Ws),i.setAttribute("aria-expanded",e)}_setAttributeIfNotExists(t,e,i){t.hasAttribute(e)||t.setAttribute(e,i)}_elemIsActive(t){return t.classList.contains(Fs)}_getInnerElement(t){return t.matches(qs)?t:z.findOne(qs,t)}_getOuterElement(t){return t.closest(".nav-item, .list-group-item")||t}static jQueryInterface(t){return this.each((function(){const e=Ks.getOrCreateInstance(this);if("string"==typeof t){if(void 0===e[t]||t.startsWith("_")||"constructor"===t)throw new TypeError(`No method named "${t}"`);e[t]()}}))}}N.on(document,Ls,Rs,(function(t){["A","AREA"].includes(this.tagName)&&t.preventDefault(),l(this)||Ks.getOrCreateInstance(this).show()})),N.on(window,Ds,(()=>{for(const t of z.find(Vs))Ks.getOrCreateInstance(t)})),m(Ks);const Qs=".bs.toast",Xs=`mouseover${Qs}`,Ys=`mouseout${Qs}`,Us=`focusin${Qs}`,Gs=`focusout${Qs}`,Js=`hide${Qs}`,Zs=`hidden${Qs}`,to=`show${Qs}`,eo=`shown${Qs}`,io="hide",no="show",so="showing",oo={animation:"boolean",autohide:"boolean",delay:"number"},ro={animation:!0,autohide:!0,delay:5e3};class ao extends W{constructor(t,e){super(t,e),this._timeout=null,this._hasMouseInteraction=!1,this._hasKeyboardInteraction=!1,this._setListeners()}static get Default(){return ro}static get DefaultType(){return oo}static get NAME(){return"toast"}show(){N.trigger(this._element,to).defaultPrevented||(this._clearTimeout(),this._config.animation&&this._element.classList.add("fade"),this._element.classList.remove(io),d(this._element),this._element.classList.add(no,so),this._queueCallback((()=>{this._element.classList.remove(so),N.trigger(this._element,eo),this._maybeScheduleHide()}),this._element,this._config.animation))}hide(){this.isShown()&&(N.trigger(this._element,Js).defaultPrevented||(this._element.classList.add(so),this._queueCallback((()=>{this._element.classList.add(io),this._element.classList.remove(so,no),N.trigger(this._element,Zs)}),this._element,this._config.animation)))}dispose(){this._clearTimeout(),this.isShown()&&this._element.classList.remove(no),super.dispose()}isShown(){return this._element.classList.contains(no)}_maybeScheduleHide(){this._config.autohide&&(this._hasMouseInteraction||this._hasKeyboardInteraction||(this._timeout=setTimeout((()=>{this.hide()}),this._config.delay)))}_onInteraction(t,e){switch(t.type){case"mouseover":case"mouseout":this._hasMouseInteraction=e;break;case"focusin":case"focusout":this._hasKeyboardInteraction=e}if(e)return void this._clearTimeout();const i=t.relatedTarget;this._element===i||this._element.contains(i)||this._maybeScheduleHide()}_setListeners(){N.on(this._element,Xs,(t=>this._onInteraction(t,!0))),N.on(this._element,Ys,(t=>this._onInteraction(t,!1))),N.on(this._element,Us,(t=>this._onInteraction(t,!0))),N.on(this._element,Gs,(t=>this._onInteraction(t,!1)))}_clearTimeout(){clearTimeout(this._timeout),this._timeout=null}static jQueryInterface(t){return this.each((function(){const e=ao.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t])throw new TypeError(`No method named "${t}"`);e[t](this)}}))}}return R(ao),m(ao),{Alert:Q,Button:Y,Carousel:xt,Collapse:Bt,Dropdown:qi,Modal:On,Offcanvas:qn,Popover:us,ScrollSpy:Es,Tab:Ks,Toast:ao,Tooltip:cs}}));
//# sourceMappingURL=bootstrap.bundle.min.js.map
;/*!
 * Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com
 * License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
 * Copyright 2024 Fonticons, Inc.
 */
;