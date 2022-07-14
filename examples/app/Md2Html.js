
/**
* markdown文件转html页面
* @constructor
*/
import fs from 'fs'; //文件模块
import path from 'path'; //路径模块
import { marked } from 'marked'; //md转html模块
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default class Md2Html {
  constructor(fileName) {
    this.fileName = fileName || 'unnamed';
    this.target = path.join(__dirname) + '/' + this.fileName + '.md';
    this.watchFile();
  }

  /**
  * 检测文件改动
  */
  watchFile () {
    fs.readFile(this.target, 'utf-8', (err, data) => { //读取文件

      if (err) {
        throw err;
      }

      const html = marked(data); //将md内容转为html内容
      let template = this.createTemplate();
      template = template.replace('{{{content}}}', html); //替换html内容占位标记

      this.createFile(template);
    });
  }


  /**
   * 创建页面模板
   * @returns {string} 页面骨架字符串
   */

  createTemplate () {
    const template = `<!DOCTYPE html>
       <html>
           <head>
           <meta charset="utf-8" >
           <meta name="viewport" content="width=device-width, initial-scale=1">
           <title>md文件转html页面</title>
           <style>
               .markdown-body {
                   box-sizing: border-box;
                   min-width: 200px;
                   max-width: 980px;
                   margin: 0 auto;
                   padding: 45px;
               }
               @media (max-width: 767px) {
                   .markdown-body {
                       padding: 15px;
                   }
               }
               </style>
               <link rel="stylesheet" href="./github-markdown.min.css">
           </head>
           <body>
               <article class="markdown-body">
                   {{{content}}}
               </article>
           </body>
       </html>`;
    return template;
  }


  /**
   * 创建html文件
   * @param {string} content 写入html的文件内容
   */
  createFile (content) {
    const name = this.fileName; //文件名
    const suffix = 'html'; //文件格式
    const fullName = name + '.' + suffix;  //文件全名
    const file = path.join(__dirname, fullName); //文件地址

    fs.writeFile(file, content, 'utf-8', err => {
      if (err) {
        throw err;
      }
    });
  }
}
