const http = require('http');
const https = require('https');
const querystring = require('querystring');

const path = require('path')
const AWS = require('aws-sdk')

const S3 = new AWS.S3({
  signatureVersion: 'v4',
})

const Sharp = require('sharp')
const BUCKET = 'bucket-name'
const QUALITY = 75

exports.handler = async (event, context, callback) => {

  let response = event.Records[0].cf.response
  console.log("Response status code : %s", response.status);

  let request = event.Records[0].cf.request;
  console.log("Request is ", request)

  const headers = response.headers
  console.log("Response Headers is ", headers)

  const request_headers = request.headers
  console.log("Request Headers is ", request_headers)
  console.log("originalKey Object is ", request_headers.originalkey)

  const originalKey = request_headers.originalkey[0].value
  console.log("originalKey is ", originalKey)

  console.log("dimensionincluded Object is ", request_headers.dimensionincluded)

  const dimensionincluded = request_headers.dimensionincluded[0].value
  console.log("dimensionincluded is ", dimensionincluded)

  // if (path.extname(uri) === '.webp') {
  if (parseInt(response.status) === 404) {

    const { uri } = request
    console.log("URI is ", uri)

    let params = querystring.parse(request.querystring);
    console.log("Params is", params)

    // read the required path. Ex: uri /images/100x100/webp/image.jpg
    let path = request.uri;
    console.log("path:", path)

    // read the S3 key from the path variable.
    // Ex: path variable /images/100x100/webp/image.jpg
    let newKey = path.substring(1);
    console.log("key:", newKey)

    // Ex: file_name=images/200x200/webp/image_100x100.jpg
    // Getting the image_100x100.webp part alone
    let file_name = path.split('/').slice(-1)[0]
    console.log("Filename : ", file_name)

    // get the source image file
    console.log("Printing original key again", originalKey)

    try {
      if (dimensionincluded == "false" || dimensionincluded == false) {
        let requiredFormat = file_name.split('.')[1]
        console.log("Format : ", requiredFormat)

        const bucketResource = await S3.getObject({ Bucket: BUCKET, Key: originalKey }).promise()
        console.log("Got image", bucketResource)

        // perform the resize operation
        console.log("Width or height is not available")

        const sharpImageBuffer = await Sharp(bucketResource.Body)
          .webp({ quality: +QUALITY })
          .toBuffer()
        console.log('Image buffer', sharpImageBuffer)

        // save the resized object to S3 bucket with appropriate object key.
        await S3.putObject({
          Body: sharpImageBuffer,
          Bucket: BUCKET,
          ContentType: 'image/webp',
          CacheControl: 'max-age=31536000',
          Key: newKey,
          StorageClass: 'STANDARD'
        }).promise()

        // generate a binary response with resized image
        response.status = 200;
        response.body = sharpImageBuffer.toString('base64');
        response.bodyEncoding = 'base64';
        response.headers['content-type'] = [{ key: 'Content-Type', value: 'image/' + requiredFormat }];
        callback(null, response);
      } else {
        // perform the resize operation
        console.log("Width or height is available")

        // Getting the 100x100.webp part alone
        let dimension = file_name.split('_')[1].split('.')[0]
        console.log("Dimension : ", dimension)

        let requiredFormat = file_name.split('_')[1].split('.')[1]
        console.log("Format : ", requiredFormat)

        let width = dimension.split('x')[0]
        console.log("Width : ", width)

        let height = dimension.split('x')[1]
        console.log("Height : ", height)

        const bucketResource = await S3.getObject({ Bucket: BUCKET, Key: originalKey }).promise()
        console.log("Got image", bucketResource)

        const sharpImageBuffer = await Sharp(bucketResource.Body)
          .resize(parseInt(width), parseInt(height))
          .webp({ quality: +QUALITY })
          .toBuffer()
        console.log('Image buffer', sharpImageBuffer)
        // save the resized object to S3 bucket with appropriate object key.
        await S3.putObject({
          Body: sharpImageBuffer,
          Bucket: BUCKET,
          ContentType: 'image/webp',
          CacheControl: 'max-age=31536000',
          Key: newKey,
          StorageClass: 'STANDARD'
        }).promise()

        // generate a binary response with resized image
        response.status = 200;
        response.body = sharpImageBuffer.toString('base64');
        response.bodyEncoding = 'base64';
        response.headers['content-type'] = [{ key: 'Content-Type', value: 'image/' + requiredFormat }];
        callback(null, response);
      }
    } catch (e) {
      console.log("Inside catch block of try :%j",e);
    }
  } else {
    console.log("Its not 404, So returning webp")
    headers['content-type'] = [{
      'value': 'image/webp',
      'key': 'Content-Type'
    }]
  }
  callback(null, response)
 }
