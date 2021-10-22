const [fs, path] = [require('fs'), require('path')];

const langData = require('./src/lang/zh_copy')

const s = process.argv[2];

const filePath = path.join(__dirname, 'src'); // 目标文件夹

const name = './0521.xls';

const code = 'zh-CN';

let dataList = []; let gateway = ''; let appName = ''; let
    reg;

const getHtml = function (url, callback) {
    fs.readFile(url, 'utf8', (err, data) => {
        if (!err) {
            callback(data);
        }
    });
};

const setHtml = function (url, data, callback) {
    fs.writeFile(url, data, (err) => {
        if (err) {
            callback(`${url} 替换失败`);
        } else {
            callback(`${url} 替换成功`);
        }
    });
};

const replaceHtml = function (data) {
    return data.replace(/([a-zA-Z\-]+)\s*[=:]\s*(["'])\s*[A-Z0-9()\u4e00-\u9fa5]*[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]*([:：])?\s*(\2)|>([^<>]*)[A-Z0-9()\u4e00-\u9fa5]*[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]*([^<>]*)</ig, ($0, $8, $1, $2) => {
        if ($8 === 'prop') return $0;
        return $0.replace(/^(.*?)([A-Z0-9()\u4e00-\u9fa5]*[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]*)(.*?)$/g, ($3, $4, $5, $6) => {
            console.log('====', $5);
            if ($5) {
                for (const ele in langData) {
                    if (langData[ele] === $5) {
                        
                        const key = `$t(${ele})`;
                        return `${$4}{{${key}}}${$6}`;
                    }
                }
                
            }
            console.log($5, '>>>', '未找到对应的国际化数据');

            return $3;
        });
    });
};

const replaceScript = function (data) {
    return data.replace(/(["'])(.*?)([A-Z0-9()\u4e00-\u9fa5]*[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]*)(.*?)(\1)([^:({])/g, ($0, $1, $2, $3, $4, $5, $6) => {
        if ($3) {
            for (const ele in langData) {
                if (langData[ele] === $3) {
                    
                    const key = `this.$t(${ele})`;
                    return `${$2.length ? `${$1 + $2 + $1}+` : ''}${key}${$4.length ? `+${$1}${$4}${$1}` : ''}${$6}`;
                }
            }
            
        }
        console.log($3, '>>>', '未找到对应的国际化数据');

        return $0;
    });
};

const fileDisplay = function (filePath, callback) {
    fs.readdir(filePath, (err, files) => {
        if (err) {
            console.warn(err);
        } else {
            files.forEach((filename) => {
                const filedir = path.join(filePath, filename);
                fs.stat(filedir, (eror, stats) => {
                    if (eror) {
                        console.warn('获取文件stats失败');
                    } else {
                        const isFile = stats.isFile();
                        const isDir = stats.isDirectory();
                        if (isFile) {
                            if (/\.vue$/.test(filedir)) callback(filedir);
                        } else if (isDir) {
                            fileDisplay(filedir, callback);
                        }
                    }
                });
            });
        }
    });
};

const getStrVal = function (str, key) {
    const reg = new RegExp(`${key}\\s*:\\s*(["'])(.+?)(\\1)`);
    return str.match(reg) ? str.match(reg)[2] : '';
};

const getLang = function () {
    return new Promise(((resolve, reject) => {
        getHtml(path.join(__dirname, 'scaffold-config.js'), (data) => {
            gateway = getStrVal(data, 'gateway');
            appName = getStrVal(data, 'languageGroupCode');
            reg = new RegExp(appName);
            const opt = {
                url: `${gateway}/i18n/i18nResource/queryI18nResourceListByGroup`,
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                data: {
                    locale: code,
                    groupCode: [appName],
                },
            };
            axios(opt)
                .then((data) => {
                    const obj = {};
                    for (const k in data.data.result) {
                        obj[data.data.result[k]] = k;
                    }
                    dataList = obj;
                    resolve(obj);
                }).catch((err) => {
                    reject(err);
                });
        });
    }));
};

// 替换
const i18nTxt = async function () {
    // await getLang();
    fileDisplay(filePath, (_path) => {
        // let _path = path.join(__dirname,'modules','abnormal','export.vue');
        getHtml(_path, (data) => {
            if (Array.isArray(data.match(/<template>[\s\S]+<\/template>/))) {
                console.log('html', data.match(/<template>[\s\S]+<\/template>/));
            }
            if (_path.indexOf('\\ECNManagement\\steps.vue') !== -1)return;
            let html = data.match(/<template>[\s\S]+<\/template>/);
            let script = data.match(/<script>[\s\S]+<\/script>/);
            const style = data.match(/<style[\s\S]+<\/style>/);
            html = html && replaceHtml(html[0]);
            s === 'script' && script && (script = replaceScript(script[0]));
            setHtml(_path, `${html}\n${script}\n${(style || []).join('\n')}`, (str) => {
                console.log(str);
            });
        });
    });
};
i18nTxt();

// 获取中文
const getZh = async function () {
    let arr = [];
    // await getLang();
    let time = {};
    // let arrPath = ['CQA','FPY','FTY','general-setting','LAR-setting','LRR','VLRR','TCRR'];
    // arrPath.forEach(p=>{
    // fileDisplay(path.join(__dirname, 'modules',p), function (_path) {
    fileDisplay(path.join(__dirname, 'src'), (_path) => {
        getHtml(_path, (data) => {
            const zh = data.match(/(?!prop[=:'"\s]+)([A-Z0-9()\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5\/\\\-]*){0,1}[\u4e00-\u9fa5]{1,}([A-Z0-9()\u4e00-\u9fa5\/\\\-]*[A-Z0-9()\u4e00-\u9fa5]){0,1}(?![A-Z\u4e00-\u9fa50-9)])/ig);
            arr = arr.concat(zh);
            clearTimeout(time);
            time = setTimeout(() => {
                const json = [];
                [...new Set(arr)].forEach((s) => {
                    json.push({ 'zh-CN': s });
                });
                const ss = xlsx.utils.json_to_sheet(json); // 通过工具将json转表对象
                const workbook = { // 定义操作文档
                    SheetNames: ['i18n'], // 定义表明ECN导入时间ECN导入时间
                    Sheets: {
                        i18n: { ...ss }, // 表对象[注意表明]
                    },
                };
                xlsx.writeFile(workbook, './g.xls'); // 将数据写入文件
            }, 1000);
        });
    });
    // });
};
// getZh();

// 获取英文生产code
const setI18nCode = function (flag) {
    const Prefix = 'LenovoQMS.'; // 统一前缀
    const workbook = xlsx.readFile(name);
    const sheetNames = workbook.SheetNames;
    const worksheet = workbook.Sheets[sheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // 去重
    if (flag) {
        for (let i = data.length - 1; i > 0; i--) {
            const v = data[i]['zh-CN'];
            const obj = data.filter((item) => item['zh-CN'] === v);
            if (obj.length > 1) {
                data.splice(i, 1);
            }
        }
    }


    // xls模板
    // zh-CN	    en-US	            zh-TW	    code
    // 新增异常单	Add exception ticket	新增異常單	pqmAddexceptionticket


    data.map((item) => item.code = (Prefix + item['en-US'].replace(/[-\s.\d]/g, '')).replace(/^(.{25}).+$/, '$1'));

    const ss = xlsx.utils.json_to_sheet(data);
    const workbooks = {
        SheetNames: ['i18n'],
        Sheets: {
            i18n: { ...ss },
        },
    };
    xlsx.writeFile(workbooks, name);
};
// setI18nCode();

// 写入到 服务端
const setI18n = async function () {
    const workbook = xlsx.readFile(name);
    const sheetNames = workbook.SheetNames;
    const worksheet = workbook.Sheets[sheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);

    getHtml(path.join(__dirname, 'scaffold-config.js'), (str) => {
        gateway = getStrVal(str, 'gateway');
        appName = getStrVal(str, 'languageGroupCode');
        let n = 0;
        const errA = [];
        const fn = function (i) {
            const opt = {
                url: `${gateway}/i18n/i18nResourceSet/createI18nResourceSet`,
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    accesstoken: '8b8a955d239c1490009fe05b0bdb0d414cc88aed598d02c9ee5d3eda01fc09ec89b7a67c63a6ac8f53e12bcbc9b3437c',
                    appName,
                },

                data: {
                    languages: (function (i) {
                        const arr = [{ name: '键', resourceValue: data[i].code }];
                        if (data[i]['en-US']) {
                            arr.push({ name: '英文', resourceValue: data[i]['en-US'], languageCode: 'en-US' });
                        }
                        if (data[i]['zh-CN']) {
                            arr.push({ name: '简体', resourceValue: data[i]['zh-CN'], languageCode: 'zh-CN' });
                        }
                        if (data[i]['zh-TW']) {
                            arr.push({ name: '繁體', resourceValue: data[i]['zh-TW'], languageCode: 'zh-TW' });
                        }
                        return arr;
                    }(i)),
                    resourceKey: data[i].code,
                    resourceGroup: appName,
                },
            };
            axios(opt)
                .then((d) => {
                    console.log(data[i].code, '成功>');
                    i++;
                    data[i] && fn(i);
                    n = 0;
                }).catch((err) => {
                    n++;
                    if (n < 5) {
                        fn(i);
                    } else {
                        console.log(err, '>>');
                        console.log(data[i].code, '失败>');
                        errA.push(data[i]);
                        i++;
                        if (data[i]) {
                            fn(i);
                        } else {
                            const ss = xlsx.utils.json_to_sheet(errA);
                            const workbooks = {
                                SheetNames: ['i18n'],
                                Sheets: {
                                    i18n: { ...ss },
                                },
                            };
                            xlsx.writeFile(workbooks, './err.xls');
                        }
                    }
                });
        };
        fn(0);
    });
};
// setI18n();

// 获取页面颜色
const getColor = function () {
    let arr = [];
    fileDisplay(filePath, (_path) => {
        getHtml(_path, (data) => {
            const zh = data.match(/#[\d\w]{3,6}|rgba?\([^)]+\)/ig);
            arr = arr.concat(zh);
            const json = [];
            [...new Set(arr)].forEach((s) => {
                json.push({ zh: s });
            });
            const ss = xlsx.utils.json_to_sheet(json); // 通过工具将json转表对象
            const workbook = { // 定义操作文档
                SheetNames: ['i18n'], // 定义表明ECN导入时间ECN导入时间
                Sheets: {
                    i18n: { ...ss }, // 表对象[注意表明]
                },
            };
            xlsx.writeFile(workbook, './color.xls'); // 将数据写入文件
        });
    });
};
// getColor();
