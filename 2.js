fs = require('fs');

process.argv.slice(2).forEach(function(val, index, array) {
  fs.readFile(val, 'utf-8', function(err, data) {
    file = data.replace(/^/mg, '\'');
    file = file.replace(/$/mg, ' \' +');
    file = file.replace(/^/, 'script = ');
    file = file.replace(/\+$/, '');
    file = file.replace(/$/, '\nmodule.exports = script');
    output = val.replace(/[.].*?$/, '.js');
    fs.writeFile(output, file, function(err) {
      if (err) {
        console.error('ERROR: failed to convert ' + val);
      } else {
        console.log('Converted ' + val + ' to ' + output); 
      }
    });

  });

});
