# transformTxt
用于项目中实现国际化的需求，一般需求方提供了 中文对应的英文 txt文件， 通过node.js的fs库，生成以同样的key对应的中文文件、英文文件。则可以通过中英文来切换使用的语言文件了。

### 使用方式
命令行执行 node main.js 即可

### 文件说明
assets 文件夹中的data.txt是数据源文件
index.js 是生成的中文文件
indexEnglish.js 是生成的英文文件
