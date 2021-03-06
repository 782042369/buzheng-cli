# buzheng-cli

基于 imagemin 的图片压缩 cli 工具

## 开发环境

-   Node.js 14.17.0
-   yarn 1.22.19

## Install

```javascript
  yarn add buzheng-cli global
```

## Api

```javascript
  默认命令： buzheng-cli
```

如果需要指定图片压缩的文件，请添加 folder 参数，默认为项目目录下的 src 文件夹

```javascript
  // 修改为处理config文件夹下内容
  buzheng-cli folder=config
```

如果要生成图片压缩比等信息，请添加 md 参数，默认不开启

```javascript
  buzheng-cli md=true
```

默认任务执行队列 10，可以自定义

```javascript
  buzheng-cli limit=5
```

完整命令：

```javascript
  buzheng-cli folder=src md=true limit=5
```

## Examples

使用方式可以查看[examples/app](https://github.com/782042369/buzheng-cli/tree/master/examples/app)这个项目
