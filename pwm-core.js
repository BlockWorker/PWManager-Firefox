const defaultSymbols = " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

const cs = crypto.subtle;

String.prototype.insert = function(index, string) {
  if (index > 0) {
    return this.substring(0, index) + string + this.substr(index);
  }

  return string + this;
};

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

function getIdentConfig(ident, callback) { //callback with args iter, symbols
  browser.storage.sync.get(ident).then(obj => {
    const result = obj[ident];
    if (result == undefined) callback(0, defaultSymbols);
    else callback(result[0], result[1]);
  });
}
