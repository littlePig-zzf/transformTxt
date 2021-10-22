let [fs,path,request] = [require("fs"),require("path"),require("request")];

let s = process.argv[2];

let filePath = path.join(__dirname,'src','pages');
let code = "zh-CN";
let dataList = [],gateway="",appName="",reg;

let getHtml = function (url,callback) {
    fs.readFile(url, 'utf8', function(err, data){
        if(!err){
            callback(data);
        }
    });
};

let setHtml = function (url,data,callback) {
    fs.writeFile(url, data, function(err){
        if(err) {
            callback(url+" 替换失败");
        }else{
            callback(url+" 替换成功");
        }
    });
};

let replaceHtml = function (data) {
    // return data.replace(/<el-input[^>]+?v-model(\.trim)?/g,function($0,$1){
    //     if(!$1)return $0+'.trim';
    //     else return $0;
    // });
    return data.replace(/([a-zA-Z\-]+)=(["'])[A-Z0-9()\u4e00-\u9fa5]*[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]*([:：])?(\2)|>(\s*)[A-Z0-9()\u4e00-\u9fa5]+[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]+(\s*)</ig,function ($0,$8,$1,$2) {
        if($8==="prop")return $0;
        return $0.replace(/(.+?)([A-Z0-9()\u4e00-\u9fa5]*[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]*)(.+)/g, function ($3, $4, $5, $6) {
            for (let k in dataList){
                if (dataList[k] === $5) {
                    let key = /\./.test(k)?k.replace(reg,"$root.langs"):("$root.langs."+k);
                    if ($0.indexOf("=") !== -1) {
                        if ($1 && $2) {
                            let f = $1 === '"' ? "'" : '"';
                            let end = $6.replace(/[:：]/, function ($7) {
                                return `+${f}${$7}${f}`;
                            });
                            return `:${$4}${key}${end}`
                        }
                        return `:${$4}${key}${$6}`
                    } else {
                        return `${$4}{{${key}}}${$6}`;
                    }
                }
            }
            return $3;
        });
    })
};

let replaceScript = function (data) {
    return data.replace(/(["'])(\s*)([A-Z0-9()\u4e00-\u9fa5]*[\u4e00-\u9fa5][A-Z0-9()\u4e00-\u9fa5]*)(\s*)(\1)([^:({])/g,function($0,$1,$2,$3,$4,$5,$6){
        for (let k in dataList){
            if (dataList[k] === $3) {
                let key = /\./.test(k)?k.replace(reg,"$root.langs"):("$root.langs."+k);
                return `${$2.length?$1+$2+$1+'+':''}this.${key}${$4.length?'+'+$1+$4+$1:''}${$6}`;
            }
        }
        return $0;
    });
};

let fileDisplay = function(filePath,callback){
    fs.readdir(filePath,function(err,files){
        if(err){
            console.warn(err)
        }else{
            files.forEach(function(filename){
                let filedir = path.join(filePath,filename);
                fs.stat(filedir,function(eror,stats){
                    if(eror){
                        console.warn('获取文件stats失败');
                    }else{
                        let isFile = stats.isFile();
                        let isDir = stats.isDirectory();
                        if(isFile){
                            if(/\.vue$/.test(filedir))callback(filedir);
                        }else if(isDir){
                            fileDisplay(filedir,callback);
                        }
                    }
                })
            });
        }
    });
};

let getStrVal = function(str,key){
    let reg = new RegExp(key + "\\s*=\\s*([\"'])(.+?)(\\1)");
    return str.match(reg)?str.match(reg)[2]:"";
};

let getLang = function () {
    return new Promise(function(resolve, reject){
        getHtml(path.join(__dirname,"static","js","config.js"),function (data) {
            gateway = getStrVal(data,"window.gateway");
            appName = getStrVal(data,"window.appName");
            reg = new RegExp(appName);
            let opt = {
                url: `${gateway}/i18n/i18nResource/queryI18nResourceListByGroup`,
                method: "POST",
                json: true,
                headers: {
                    "content-type": "application/json",
                },
                body: {
                    "locale": code,
                    "groupCode": [appName]
                }
            };
            request.post(opt,function(err,res,body){
                if(!err && +body.code ===0){
                    dataList = body.result;
                    resolve();
                }else{
                    reject();
                }
            });
        });
    });
};

(async function(){
    await getLang();
    fileDisplay(filePath,function(_path){
        // let _path = path.join(__dirname,"src/modules/supplierManagement/add.vue");
        getHtml(_path,function (data) {
            let html = data.match(/<template>[\s\S]+<\/template>/)[0];
            let script = data.match(/<script>[\s\S]+<\/script>/)[0];
            let style = data.match(/<style[\s\S]+<\/style>/);
            html = replaceHtml(html);
            s==='script'&&(script = replaceScript(script));
            setHtml(_path,(html||'')+"\n"+(script||'')+"\n"+(style&&style.join("\n")),function (str) {
                console.log(str)
            })
        });
    });
})();
