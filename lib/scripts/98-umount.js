'use strict';
const child_process = require('child_process');

function command(options, log, callback) {
    if (!options.mount) {
        return callback('NO mount path specified!');
	}
	if (options.mountType === 'CIFS' || options.mountType === 'NFS') {
		setTimeout(function() {
			child_process.exec(`umount ${options.backupDir}`, (error, stdout, stderr) => {
				if (error) {
					options.context.errors.umount = error;
					log.error(stderr);
					callback(error)
				} else {
					options.context.done.push('umount');
					callback(null, stdout);
				}
			});
		}, 10000);
	} else {
		callback(null);
	}
}

module.exports = {
    command,
    ignoreErrors: true
};