let [fs, path, axios, xlsx] = [require("fs"), require("path"), require("../jw-scaffold/node_modules/axios"), require('../jw-scaffold/node_modules/xlsx')];

let s = process.argv[2];

let filePath = path.join(__dirname, 'src');  //目标文件夹

let name = "./0521.xls";

let code = "zh-CN";

let dataList = [], gateway = "", appName = "", reg;

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
    return data.replace(/([a-zA-Z\-]+)\s*[=:]\s*(["'])\s*[A-Z0-9()\u4e00-\u9fa5]*[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]*([:：])?\s*(\2)|>([^<>]*)[A-Z0-9()\u4e00-\u9fa5]*[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]*([^<>]*)</ig, function ($0, $8, $1, $2) {
        if ($8 === "prop")return $0;
        return $0.replace(/^(.*?)([A-Z0-9()\u4e00-\u9fa5]*[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]*)(.*?)$/g, function ($3, $4, $5, $6) {
            // console.log($0,"====",$5,dataList[$5]);
            if (dataList[$5]) {
                let key = `$root.langs['${dataList[$5]}']`;
                if ($0.indexOf("=") !== -1) {
                    if ($1 && $2) {
                        let f = $1 === '"' ? "'" : '"';
                        let end = $6.replace(/[:：]/, function ($7) {
                            return `+${f}${$7}${f}`;
                        });
                        return `:${$4}${key}${end}`
                    }
                    return `:${$4}${key}${$6}`
                }else if($3.indexOf(":") !== -1 && $1){
                    return $3.replace(/'/g,"").replace($5,key);
                } else {
                    return `${$4}{{${key}}}${$6}`;
                }
            } else {
                console.log($5,">>>","未找到对应的国际化数据")
            }
            return $3;
        });
    })
};

let replaceScript = function (data) {
    return data.replace(/(["'])(.*?)([A-Z0-9()\u4e00-\u9fa5]*[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]*)(.*?)(\1)([^:({])/g, function ($0, $1, $2, $3, $4, $5, $6) {
        if (dataList[$3]) {
            let key = `this.$root.langs['${dataList[$3]}']`;
            return `${$2.length ? $1 + $2 + $1 + '+' : ''}${key}${$4.length ? '+' + $1 + $4 + $1 : ''}${$6}`;
        }else{
            console.log($3,">>>","未找到对应的国际化数据")
        }
        return $0;
    });
};

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
                            if (/\.vue$/.test(filedir)) callback(filedir);
                        } else if (isDir) {
                            fileDisplay(filedir, callback);
                        }
                    }
                })
            });
        }
    });
};

let getStrVal = function (str, key) {
    let reg = new RegExp(key + "\\s*:\\s*([\"'])(.+?)(\\1)");
    return str.match(reg) ? str.match(reg)[2] : "";
};

let getLang = function () {
    return new Promise(function (resolve, reject) {
        getHtml(path.join(__dirname, "scaffold-config.js"), function (data) {
            gateway = getStrVal(data, "gateway");
            appName = getStrVal(data, "languageGroupCode");
            reg = new RegExp(appName);
            let opt = {
                url: `${gateway}/i18n/i18nResource/queryI18nResourceListByGroup`,
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                data: {
                    "locale": code,
                    "groupCode": [appName]
                }
            };
            axios(opt)
                .then(function (data) {
                    let obj = {};
                    for (let k in data.data.result) {
                        obj[data.data.result[k]] = k;
                    }
                    dataList = obj;
                    resolve(obj);
                }).catch(err => {
                reject(err);
            });
        });
    });
};

// 替换
let i18nTxt = async function () {
    await getLang();
    fileDisplay(filePath, function (_path) {
        // let _path = path.join(__dirname,'modules','abnormal','export.vue');
        getHtml(_path, function (data) {
            // if (_path.indexOf('\\ECNManagement\\steps.vue') !== -1)return;
            let html = data.match(/<template>[\s\S]+<\/template>/)[0];
            let script = data.match(/<script>[\s\S]+<\/script>/);
            let style = data.match(/<style[\s\S]+<\/style>/);
            html = replaceHtml(html);
            s === 'script' && script && (script = replaceScript(script[0]));
            setHtml(_path, html + "\n" + script + "\n" + (style || []).join("\n"), function (str) {
                console.log(str)
            })
        });
    });
};
// i18nTxt();

//获取中文
let getZh = async function () {
    let arr = [];
    // await getLang();
    let time = {};
    // let arrPath = ['CQA','FPY','FTY','general-setting','LAR-setting','LRR','VLRR','TCRR'];
    // arrPath.forEach(p=>{
        // fileDisplay(path.join(__dirname, 'modules',p), function (_path) {
        fileDisplay(path.join(__dirname, 'modules'), function (_path) {
            getHtml(_path, function (data) {
                let zh = data.match(/(?!prop[=:'"\s]+)([A-Z0-9()\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5\/\\\-]*){0,1}[\u4e00-\u9fa5]{1,}([A-Z0-9()\u4e00-\u9fa5\/\\\-]*[A-Z0-9()\u4e00-\u9fa5]){0,1}(?![A-Z\u4e00-\u9fa50-9)])/ig);
                arr = arr.concat(zh);
                clearTimeout(time);
                time = setTimeout(function () {
                    let json = [];
                    [...new Set(arr)].forEach(s => {
                        json.push({'zh-CN': s});
                    });
                    let ss = xlsx.utils.json_to_sheet(json); //通过工具将json转表对象
                    let workbook = { //定义操作文档
                        SheetNames: ['i18n'], //定义表明ECN导入时间ECN导入时间
                        Sheets: {
                            'i18n': Object.assign({}, ss) //表对象[注意表明]
                        },
                    };
                    xlsx.writeFile(workbook, "./g.xls"); //将数据写入文件
                },1000);
            })
        })
    // });
};
 getZh();

//获取英文生产code
let setI18nCode = function (flag) {
    let Prefix = 'LenovoQMS.'; //统一前缀
    const workbook = xlsx.readFile(name);
    const sheetNames = workbook.SheetNames;
    const worksheet = workbook.Sheets[sheetNames[0]];
    let data = xlsx.utils.sheet_to_json(worksheet);

    //去重
    if (flag) {
        for (let i = data.length - 1; i > 0; i--) {
            let v = data[i]['zh-CN'];
            let obj = data.filter(item => item['zh-CN'] === v);
            if (obj.length>1) {
                data.splice(i, 1);
            }
        }
    }


    //xls模板
    // zh-CN	    en-US	            zh-TW	    code
    // 新增异常单	Add exception ticket	新增異常單	pqmAddexceptionticket


    data.map(item=>item.code = (Prefix + item['en-US'].replace(/[-\s.\d]/g,'')).replace(/^(.{25}).+$/,'$1'));

    let ss = xlsx.utils.json_to_sheet(data);
    let workbooks = {
        SheetNames: ['i18n'],
        Sheets: {
            'i18n': Object.assign({}, ss)
        },
    };
    xlsx.writeFile(workbooks, name);
};
// setI18nCode();

//写入到 服务端
let setI18n = async function () {
    const workbook = xlsx.readFile(name);
    const sheetNames = workbook.SheetNames;
    const worksheet = workbook.Sheets[sheetNames[0]];
    let data = xlsx.utils.sheet_to_json(worksheet);

    getHtml(path.join(__dirname, "scaffold-config.js"), function (str) {
        gateway = getStrVal(str, "gateway");
        appName = getStrVal(str, "languageGroupCode");
        let n = 0;
        let errA = [];
        let fn = function (i) {
            let opt = {
                url:`${gateway}/i18n/i18nResourceSet/createI18nResourceSet`,
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    'accesstoken':"8b8a955d239c1490009fe05b0bdb0d414cc88aed598d02c9ee5d3eda01fc09ec89b7a67c63a6ac8f53e12bcbc9b3437c",
                    "appName": appName,
                },

                data: {
                    "languages": (function (i) {
                        let arr = [{"name": "键", "resourceValue": data[i].code}];
                        if(data[i]['en-US']){
                            arr.push({"name": "英文", "resourceValue": data[i]['en-US'], "languageCode": "en-US"})
                        }
                        if(data[i]['zh-CN']){
                            arr.push({"name": "简体", "resourceValue": data[i]['zh-CN'], "languageCode": "zh-CN"})
                        }
                        if(data[i]['zh-TW']){
                            arr.push({"name": "繁體", "resourceValue": data[i]['zh-TW'], "languageCode": "zh-TW"})
                        }
                        return arr;
                    })(i),
                    "resourceKey": data[i].code,
                    "resourceGroup": appName
                }
            };
            axios(opt)
                .then(function (d) {
                    console.log(data[i].code, "成功>");
                    i++;
                    data[i] && fn(i);
                    n = 0;
                }).catch(err => {
                n++;
                if (n < 5) {
                    fn(i);
                } else {
                    console.log(err, ">>");
                    console.log(data[i].code, "失败>");
                    errA.push(data[i]);
                    i++;
                    if (data[i]) {
                        fn(i);
                    } else {
                        let ss = xlsx.utils.json_to_sheet(errA);
                        let workbooks = {
                            SheetNames: ['i18n'],
                            Sheets: {
                                'i18n': Object.assign({}, ss)
                            },
                        };
                        xlsx.writeFile(workbooks, "./err.xls");
                    }
                }
            });

        };
        fn(0);
    });
};
// setI18n();

//获取页面颜色
let getColor = function () {
    let arr = [];
    fileDisplay(filePath, function (_path) {
        getHtml(_path, function (data) {
            let zh = data.match(/#[\d\w]{3,6}|rgba?\([^)]+\)/ig);
            arr = arr.concat(zh);
            let json = [];
            [...new Set(arr)].forEach(s => {
                json.push({zh: s});
            });
            let ss = xlsx.utils.json_to_sheet(json); //通过工具将json转表对象
            let workbook = { //定义操作文档
                SheetNames: ['i18n'], //定义表明ECN导入时间ECN导入时间
                Sheets: {
                    'i18n': Object.assign({}, ss) //表对象[注意表明]
                },
            };
            xlsx.writeFile(workbook, "./color.xls"); //将数据写入文件
        })
    })
};
// getColor();