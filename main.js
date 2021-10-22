let [fs, path ] = [require("fs"), require("path")]
const { pinyin } = require('pinyin-pro');
let filePath = path.join(__dirname, 'assets');  //目标文件夹

let fileDisplay = function (filePath, callback) {
    fs.readdir(filePath, function (err, files) {
        if (err) {
            console.warn(err)
        } else {
            files.forEach(function (filename) {
                let filedir = path.join(filePath, filename);
                fs.stat(filedir, function (eror, stats) {
                    if (eror) {
                        console.warn('获取文件stats失败');
                    } else {
                        let isFile = stats.isFile();
                        let isDir = stats.isDirectory();
                        if (isFile) {
                            if (/\.txt$/.test(filedir)) callback(filedir);
                        } else if (isDir) {
                            fileDisplay(filedir, callback);
                        }
                    }
                })
            });
        }
    });
};

let getHtml = function (url, callback) {
    fs.readFile(url, 'utf8', function (err, data) {
        if (!err) {
            callback(data);
        }
    });
};

let setHtml = function (url, data, callback) {
    fs.writeFile(url, data, function (err) {
        if (err) {
            callback(url + " 替换失败");
        } else {
            callback(url + " 替换成功");
        }
    });
};

let replaceHtml = function (data) {

}

fileDisplay(filePath, function (_path) {
    getHtml(_path, function (data) {
        const start = `const data = {`
        const end = `\n}`
        let content = ''
        let englishContent = ''
        data.replace(/([0-9\u4e00-\u9fa5]+)[\s，,]*(([a-zA-Z()][0-9\x20&,-/]*)+)/g, function($0, $1, $2) {
            const english = $2.split(' ')
            const _pinyin = pinyin($1, { toneType: 'none' }).split(' ');
            let firstCode = ''
            let chineseFirstCode = ''
            // key 使用汉字的拼音首字母 + 英文的首字母组成 （避免重复）
            _pinyin.forEach(cItem=> {
                chineseFirstCode += cItem.substr(0,1)
            })
            english.forEach(item => {
                let origin = item.replace(/[^a-zA-Z0-9]/g, '')
                let text =  /[A-Za-z0-9]/.test(origin.substr(0,1)) ? origin.substr(0,1) : origin
                firstCode += text
            })
            // 排除汉字相同的情况
            if(content.indexOf("'"+$1+"'") < 0) {
                content += `\n${chineseFirstCode + firstCode}: '${$1}',`
                englishContent += `\n${chineseFirstCode + firstCode}: '${$2}',`
            }
        });
        const res = start + content + end
        const englishRes = start + englishContent + end
        // 获取目标地址
        const target = path.join(__dirname, 'assets', 'index.js')
        setHtml(target, res, function(str) {
            console.log(str);
        })
        const englishTarget = path.join(__dirname, 'assets', 'indexEnglish.js')
        setHtml(englishTarget, englishRes, function(str) {
            console.log(str);
        })
    });
});
