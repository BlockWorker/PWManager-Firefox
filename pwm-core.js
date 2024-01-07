const DEFAULT_SYMBOLS = " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
const EXPECTED_SYNC_VERSION = 1;

const cs = crypto.subtle;

var pwm_settingItems = {};
var pwm_syncSettings = { "host": "", "port": 0, "token": "", "last_sync": new Date(0) };
var pwm_syncInProgress = false;
var pwm_lastSyncSucceeded = true;

String.prototype.insert = function(index, string) {
  if (index > 0) {
    return this.substring(0, index) + string + this.substr(index);
  }

  return string + this;
};

//password generation function
function genPass(master, ident, iter, longpw, symbols, callback) {
  const base = master + ident + iter;
  cs.digest("SHA-384", new TextEncoder().encode(base)).then(rawhash => {
    const hash = new Uint8Array(rawhash);
    const nhash = new Uint8Array(hash);
    if (longpw) nhash[47] %= 3;
    var pwhash;
    cs.digest("SHA-1", nhash).then(rawdhash => {
      const dhash = new Uint8Array(rawdhash);
      if (longpw) {
        pwhash = new Uint8Array(12);
        const hashoffset = (dhash[19] % 4) * 12;
        for (let i = 0; i < 12; i++) {
          pwhash[i] = hash[hashoffset + i];
        }
      } else {
        pwhash = new Uint8Array(6);
        const hashoffset = (dhash[19] % 8) * 6;
        for (let i = 0; i < 6; i++) {
          pwhash[i] = hash[hashoffset + i];
        }
      }
      var pw = btoa(String.fromCharCode.apply(String, pwhash));
      const numsymbols = longpw ? 8 : 4;
      const numchars = longpw ? 16 : 8;
      for (let i = 0; i < numsymbols; i++) {
        const place = dhash[2 * i] % (numchars + i);
        const symbol = symbols[dhash[2 * i + 1] % symbols.length];
        pw = pw.insert(place, symbol);
      }
      callback(pw);
    });
  });
}

//reviver function for date objects from json
function jsonReviver(key, value) {
  if (key.includes("time") || key.includes("last")) {
    return new Date(Date.parse(value));
  }
  return value;
}

//check whether a sync response object is valid in structure
function syncResponseValid(syncRes) {
  return syncRes && "uuid" in syncRes && "token" in syncRes && "sync_time" in syncRes &&
          "changed_idents" in syncRes && "deleted_idents" in syncRes && syncRes.uuid &&
          typeof syncRes.uuid === "string" && syncRes.token === pwm_syncSettings.token &&
          syncRes.sync_time && syncRes.sync_time instanceof Date &&
          !isNaN(syncRes.sync_time) && Array.isArray(syncRes.changed_idents) &&
          Array.isArray(syncRes.deleted_idents);
}

//check whether an ident settings item is valid in structure
function identItemValid(item) {
  return item && "ident" in item && "iter" in item && "symbols" in item &&
          "longpw" in item && "timestamp" in item && item.ident &&
          typeof item.ident === "string" && typeof item.iter === "number" &&
          item.iter >= 0 && item.symbols && typeof item.symbols === "string" &&
          typeof item.longpw === "boolean" && item.timestamp &&
          item.timestamp instanceof Date && !isNaN(item.timestamp);
}

//check whether a sync settings object is valid in structure
function syncSettingsValid(settings) {
  return settings && "host" in settings && "port" in settings && "token" in settings &&
          "last_sync" in settings && typeof settings.host === "string" &&
          typeof settings.port === "number" && typeof settings.token === "string" &&
          settings.last_sync && settings.last_sync instanceof Date && !isNaN(settings.last_sync);
}

//load settings (idents + sync) from storage
function loadSettings(cb) {
  pwm_settingItems = {};
  pwm_syncSettings = { "host": "", "port": 0, "token": "", "last_sync": new Date(0) };
  
  try { //idents
    browser.storage.local.get({"pwm-settings": "[]"}).then(stored => {
      var list = JSON.parse(stored["pwm-settings"], jsonReviver);
      
      if (Array.isArray(list)) {
        for (var item of list) {
          if (!identItemValid(item)) {
            console.error("Load encountered invalid ident item");
            console.error(item);
            continue;
          }
          
          pwm_settingItems[item.ident] = item;
        }
      } else {
        console.error("Load encountered invalid ident list");
        console.error(list);
      }
      
      try { //sync
        browser.storage.local.get({"pwm-sync": ""}).then(sync_stored => {
          if (sync_stored["pwm-sync"]) {
            var syncSet = JSON.parse(sync_stored["pwm-sync"], jsonReviver);
            
            if (syncSettingsValid(syncSet)) {
              pwm_syncSettings = syncSet;
            } else {
              console.error("Load encountered invalid sync settings");
              console.error(syncSet);
            }
          }
          
          if (cb) cb();
        });
      } catch (e) {
        console.error("Load error while loading sync config");
        console.error(e);
      }
    });
  } catch (e) {
    console.error("Load error while loading idents");
    console.error(e);
  }
  
  
}

//check whether current sync settings are valid for sync operations
function syncValid() {
  return syncSettingsValid(pwm_syncSettings) && pwm_syncSettings.host &&
          pwm_syncSettings.port > 0 && pwm_syncSettings.token;
}

//test sync server connection with the given host and port
function testSync(host, port, resultCb) {
  if (!host || port < 1) {
    resultCb(false);
    return;
  }
  
  try {
    var req = new XMLHttpRequest();
    
    req.addEventListener("loadend", function() {
      if (req.status != 200) { //check for OK status
        resultCb(false);
        return;
      }
      
      try { //read response JSON and check for expected version
        var res = JSON.parse(req.responseText);
        
        if (res && "pwm_sync_version" in res) {
          resultCb(res.pwm_sync_version === EXPECTED_SYNC_VERSION);
        } else {
          resultCb(false);
        }
      } catch (e) {
        console.error(e);
        resultCb(false);
      }
    });
    
    req.open("GET", `https://${host}:${port}/ping`);
    req.timeout = 5000; //timeout to catch unavailable servers etc.
    req.send();
  } catch (e) {
    console.error(e);
    resultCb(false);
  }
}

//perform sync with configured server
function sync(resultCb) {
  if (pwm_syncInProgress || !syncValid()) {
    if (resultCb) resultCb(false);
    return;
  }
  
  pwm_syncInProgress = true;
  
  try { //start by testing server connection
    testSync(pwm_syncSettings.host, pwm_syncSettings.port, function(testRes) {
      if (!testRes) {
        pwm_lastSyncSucceeded = false;
        pwm_syncInProgress = false;
        if (resultCb) resultCb(false);
        return;
      }
      
      try { //send sync request with current settings
        var request = {
          "token": pwm_syncSettings.token,
          "last_sync": pwm_syncSettings.last_sync,
          "include_apps": false,
          "idents": Object.values(pwm_settingItems),
          "apps": []
        };
        
        var syncReq = new XMLHttpRequest();
        
        syncReq.addEventListener("loadend", function() {
          if (syncReq.status != 200) { //sync request failed?
            console.error(`Sync fail: Response code ${syncReq.status} type ${syncReq.responseType}`);
            pwm_lastSyncSucceeded = false;
            pwm_syncInProgress = false;
            if (resultCb) resultCb(false);
            return;
          }
          
          try {
            var syncRes = JSON.parse(syncReq.responseText, jsonReviver);
            
            if (!syncResponseValid(syncRes)) { //response valid?
              pwm_lastSyncSucceeded = false;
              pwm_syncInProgress = false;
              if (resultCb) resultCb(false);
              return;
            }
            
            var confirmation = { //create and send sync confirmation
              "uuid": syncRes.uuid,
              "token": syncRes.token,
              "sync_time": syncRes.sync_time
            };
            
            var confReq = new XMLHttpRequest();
            
            confReq.addEventListener("loadend", function() { 
              if (confReq.status != 200) { //confirmation failed?
                console.error(`Sync confirm fail: Response code ${confReq.status}`);
                pwm_lastSyncSucceeded = false;
                pwm_syncInProgress = false;
                if (resultCb) resultCb(false);
                return;
              }
              
              try { //parse sync response and apply changes
                for (let ident of syncRes.deleted_idents) {
                  if (!(ident && typeof ident === "string")) {
                    console.error("Sync received invalid ident deletion");
                    console.error(ident);
                    continue;
                  }
                  
                  delete pwm_settingItems[ident];
                }
                
                for (let item of syncRes.changed_idents) {
                  if (!identItemValid(item)) {
                    console.error("Sync received invalid ident entry");
                    console.error(item);
                    continue;
                  }
                  
                  pwm_settingItems[item.ident] = item;
                }
                
                browser.storage.local.set(
                  {"pwm-settings": JSON.stringify(Object.values(pwm_settingItems))}
                ).then(function() {
                  pwm_syncSettings.last_sync = syncRes.sync_time; //set last sync time
                  
                  browser.storage.local.set(
                    {"pwm-sync": JSON.stringify(pwm_syncSettings)}
                  ).then(function() {
                    pwm_lastSyncSucceeded = true;
                    pwm_syncInProgress = false;
                    if (resultCb) resultCb(true);
                  });
                });
              } catch (e) {
                console.error(e);
                pwm_lastSyncSucceeded = false;
                pwm_syncInProgress = false;
                if (resultCb) resultCb(false);
              }
            });
            
            confReq.open("POST", `https://${pwm_syncSettings.host}:${pwm_syncSettings.port}/confirm`);
            confReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            confReq.send(JSON.stringify(confirmation));
          } catch (e) {
            console.error(e);
            pwm_lastSyncSucceeded = false;
            pwm_syncInProgress = false;
            if (resultCb) resultCb(false);
          }
        });
        
        syncReq.open("POST", `https://${pwm_syncSettings.host}:${pwm_syncSettings.port}/sync`);
        syncReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        syncReq.send(JSON.stringify(request));
      } catch (e) {
        console.error(e);
        pwm_lastSyncSucceeded = false;
        pwm_syncInProgress = false;
        if (resultCb) resultCb(false);
      }
    });
  } catch (e) {
    console.error(e);
    pwm_lastSyncSucceeded = false;
    pwm_syncInProgress = false;
    if (resultCb) resultCb(false);
  }
}
