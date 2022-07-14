#!/usr/bin/env node

import fs from "fs";
import path from "path";
import chalk from 'chalk';
import { exec } from 'child_process';
import imagemin from 'imagemin';
import imageminJpegtran from 'imagemin-jpegtran';
import imageminOptipng from 'imagemin-optipng';
import imageminSvgo from 'imagemin-svgo';
import imageminGifsicle from 'imagemin-gifsicle';
import promiseLimit from 'promise-limit'
import Md2Html from './Md2Html.js'
import { fileURLToPath } from 'url';
import crypto from 'crypto'; //加载加密文件
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * 获取 process.argv 参数
 * @param {*} md
 * 默认不生成md文件
 * 如果需要生成md文件，传入参数md
 * node index.js md=true
 * @returns 是否生成md文件
 *
 * @param {*} folder
 * 图片压缩文件范围，默认src文件夹
 * node index.js folder=src
 * @returns
 *
 * @param {*} limit
 * 压缩图片的任务队列
 * node index.js limit=20
 * @returns
 *
 */
const args = {}
process.argv.forEach((val) => {
  if (val.includes('=')) {
    const [key, value] = val.split('=')
    args[key] = value
  }
});
/** 防止任务过多异步队列 */
const limit = promiseLimit(args['limit'] || 10)

// 需要处理的文件类型
const imgsInclude = ['.png', '.jpg', '.svg', '.gif'];
// 不进行处理的文件夹
const filesExclude = ['node_modules'];


const Log = console.log

const Success = chalk.green
const Error = chalk.bold.red;
const Warning = chalk.keyword('orange');

// 历史文件压缩后生成的md5
let keys = []

// 读取指定文件夹下所有文件
let filesList = []

// 压缩后文件列表
const squashList = []
// md文件名称
const mdfileName = '图片压缩比'
// 判断文件是否存在
function access (dir) {
  return new Promise((resolve, reject) => {
    fs.access(dir, fs.constants.F_OK, async err => {
      if (!err) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
  })
}

// 读取文件
function read (dir) {
  return new Promise((resolve, reject) => {
    fs.readFile(dir, 'utf-8', (err, data) => {
      if (!err) {
        keys = JSON.parse(data.toString()).list
        Log(Success('文件指纹读取成功'))
        resolve(keys)
      }
    })
  })
}
// md5
function md5 (str) { //暴露出md5s方法
  const md5 = crypto.createHash('md5');
  md5.update(str);
  str = md5.digest('hex');
  return str;
}
// 遍历指定类型文件
function readFile (filePath, filesList) {
  const files = fs.readdirSync(filePath);
  files.forEach((file) => {
    const fPath = path.join(filePath, file);
    const states = fs.statSync(fPath);
    // 获取文件后缀
    const extname = path.extname(file);
    if (states.isFile()) {
      const obj = {
        size: states.size,
        name: file,
        path: fPath,
      };
      const key = md5(fPath + states.size)
      if (!keys.includes(key) && imgsInclude.includes(extname)) {
        filesList.push(obj);
      }
    } else {
      if (!filesExclude.includes(file)) {
        readFile(fPath, filesList);
      }
    }
  });
}

function getFileList (filePath) {
  const filesList = [];
  readFile(filePath, filesList);
  return filesList;
}

function writeFile (fileName, data) {
  fs.writeFile(fileName, data, 'utf-8', () => {
    Log(Success('文件生成成功'))
    new Md2Html(mdfileName);
    Log(Success('查看压缩报告：', path.join(__dirname, mdfileName + '.html')))
  });
}

function transformSize (size) {
  return size > 1024 ? (size / 1024).toFixed(2) + 'KB' : size + 'B'
}

let strMd = `# 项目原始图片对比\n
## 图片压缩信息\n
| 文件名 | 文件体积 | 压缩后体积 | 压缩比 | 文件路径 |\n| -- | -- | -- | -- | -- |\n`;

function output (list) {
  let countSize = 0, countMiniSize = 0
  list.forEach(item => {
    countSize += item.size
    countMiniSize += item.miniSize
  })

  const totalSize = transformSize(countSize)
  const totalMiniSize = transformSize(countMiniSize)
  const contrastSize = (100 * (countSize - countMiniSize) / countSize).toFixed(2) + '%'

  if (args['md']) {
    for (let i = 0; i < list.length; i++) {
      const { name, path: _path, size, miniSize } = list[i];
      const fileSize = `${transformSize(size)}`;
      const compressionSize = `${transformSize(miniSize)}`;
      const compressionRatio = `${(100 * (size - miniSize) / size).toFixed(2) + '%'}`;
      const desc = `| ${name} | ${fileSize} | ${compressionSize} | ${compressionRatio} | ${_path} |\n`;
      strMd += desc;
    }
    const s = `
    ## 体积变化信息\n
    | 原始体积 | 压缩后提交 | 压缩比 |\n| -- | -- | -- |\n| ${totalSize} | ${totalMiniSize} | ${contrastSize} |
    `
    strMd = strMd + s
    writeFile(mdfileName + '.md', strMd);
  }
  Log(Success(`
    压缩对比：
    原始体积${totalSize};
    压缩后提交${totalMiniSize};
    压缩比${contrastSize};
  `))

}

// 生成文件指纹
function fingerprint () {
  const list = []
  squashList.forEach(item => {
    const { miniSize, path } = item
    const md5s = md5(path + miniSize)
    list.push(md5s)
  })
  fs.writeFile('squash.json', JSON.stringify({ list: keys.concat(list) }, null, '\t'), err => {
    if (err) throw err
    Log(Success('文件指纹生成成功'))
  })
}

function handleGetFnList () {
  return filesList.map(item => {
    return limit(() => new Promise(async (resolve, reject) => {
      try {
        const pathInfo = await fs.readFileSync(item.path)
        const files = await imagemin.buffer(Buffer.from(pathInfo), {
          plugins: [
            imageminJpegtran(),
            imageminOptipng(),
            imageminGifsicle({
              optimizationLevel: 3
            }),
            imageminSvgo({
              plugins: [{
                name: 'removeViewBox',
                active: false
              }]
            })
          ]
        });
        const fpath = await fs.readFileSync(item.path, 'binary')
        fs.writeFileSync(item.path, files, 'binary')
        Log(Success(item.path))
        const miniSize = await fs.statSync(item.path).size;
        squashList.push({ ...item, miniSize });
        resolve();
      } catch (error) {
        Log(Warning(item.path, error))
      }
    }))
  })
}
function squash () {
  try {
    const squashArr = handleGetFnList()
    if (squashArr.length === 0) {
      Log(Success('没有需要压缩的图片'))
      console.timeEnd('squash time')
      return
    }
    Promise.all(squashArr).then(() => {
      output(squashList);
      fingerprint()
      console.timeEnd('squash time')
    })
  } catch (error) {
    Log(Warning('squash error:' + error))
    return Promise.reject(error)
  }
}
// 读取目录
async function start () {
  try {
    const files = args['folder'] || 'src'
    const check = await access(files)
    if (!check) {
      Log(Error('当前文件或者文件夹不存在，请更换压缩目录'))
      return
    }
    const res = await access('squash.json')
    if (res) {
      await read('squash.json')
    }
    new Promise((resolve, reject) => {
      filesList = getFileList(files)
      resolve()
    }).then(() => {
      squash()
    })
  } catch (error) {
    Log(error)
  }
}

console.time('squash time')
start()
