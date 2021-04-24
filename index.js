const SerialPort = require('serialport')
const prompt = require('prompt-sync')({
    sigint: true
});
const fs = require('fs');
const requireDir = require('require-dir');
var configs = requireDir('./config');
var express = require('express');
var app = express();
var ip = require('ip');
SerialPort.parsers = {
    ByteLength: require('@serialport/parser-byte-length'),
    CCTalk: require('@serialport/parser-cctalk'),
    Delimiter: require('@serialport/parser-delimiter'),
    Readline: require('@serialport/parser-readline'),
    Ready: require('@serialport/parser-ready'),
    Regex: require('@serialport/parser-regex'),
};
const ByteLength = SerialPort.parsers.ByteLength;
const CCTalk = SerialPort.parsers.CCTalk;
const Delimiter = SerialPort.parsers.Delimiter;
const Readline = SerialPort.parsers.Readline;
const Ready = SerialPort.parsers.Ready;
const Regex = SerialPort.parsers.Regex;

const endpointPath = '/indicatorService';
const httpPort = 8080;
//Kullanıcı uygulamayı init ediyor.
console.log(listMethods(Object.keys(configs)));
let selectedProfile = configs[Object.keys(configs)[prompt('Profil seçiniz:') - 1]];
console.log(`Organizasyon: ${selectedProfile.Organization}\nMarka: ${selectedProfile.Brand}`);
console.log('RS232 portu dinleniyor...')

//Konfigürasyon dosyalarına göre port ayarlanıyor.
const port = new SerialPort(selectedProfile.CommunicationPort, selectedProfile.portOptions);

//Konfigürasyon dosyalarına göre okunacak data parser set ediliyor
const parser = setParser(selectedProfile.Mode, selectedProfile.options);
//port ile parser pipe'lanıyor
port.pipe(parser);

//Port açılıyor, gelen veri data.json'a yazılıyor.
parser.on('data', (line) => writeStringToFile(line.toString(), "data.json"));

initServer();

function initServer() {
    app.get(endpointPath, function (req, res) {
        fs.readFile(__dirname + "/" + "data.json", 'utf8', function (err, data) {
            console.log('%s %s (%s) --> %s', req.method, req.path, req.ip.split(`:`).pop(), data); //konsola yazdırılıyor
            res.setHeader('X-Powered-By', 'AppsAkademi');
            res.setHeader('Content-Type', 'application/json');
            res.send(data); //response olarak gönderiliyor
        });
    });

    var server = app.listen(httpPort, function () {
        var port = server.address().port;
        console.log("İndikatör Web Servisi için %s portundan yayın başladı.", port);
        console.log("Aktif erişim noktası: http://%s:%s%s", ip.address(), port, endpointPath);
    });
}

function writeStringToFile(textToWrite, fileName) {
    let jsonStr = JSON.stringify({
        data: textToWrite,
        timestamp: new Date()
    });
    fs.writeFile(__dirname + "/" + fileName, jsonStr, function (err) {
        if (err) return console.log(err);
    });
};

function listMethods(methodArray) {
    let methodsStr = '';

    methodArray.forEach((item, index) => {
        methodsStr += '[' + (index + 1) + ']' + ' ' + item + '\n';
    });
    return methodsStr;
};

function setParser(selectedMethod, options) {
    let returnMethod;
    switch (selectedMethod) {
        case 'ByteLength':
            returnMethod = new ByteLength(options);
            break;
        case 'CCTalk':
            returnMethod = new CCTalk();
            break;
        case 'Delimiter':
            returnMethod = new Delimiter(options);
            break;
        case 'Readline':
            returnMethod = new Readline(options);
            break;
        case 'Ready':
            returnMethod = new Ready({
                delimiter: 'READY'
            });
            break;
        case 'Regex':
            returnMethod = new Regex();
    }
    return returnMethod;
};