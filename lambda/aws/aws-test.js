const AWS = require('aws-sdk')
const Sharp = require('sharp')
const S3 = new AWS.S3({
  signatureVersion: 'v4',
})
AWS.config.update({
  region: 'us-east-1'
})
const BUCKET = 'image-webp-conversion-test'

S3.getObject({ Bucket: BUCKET, Key: 'table-cushion.jpg' }).promise()
.then(data => {
  console.log(data)
})
.catch( err => {
  console.log("Exception while reading source image :%j",err);
});
// S3.getObject({ Bucket: BUCKET, Key: 'table-cushion.jpg' }).promise()
//   .then(data => Sharp(data.Body)
//     .resize(100, 100)
//     .toFormat('webp')
//     .toBuffer()
//   )
//   .then(buffer => {
//     // save the resized object to S3 bucket with appropriate object key.
//     S3.putObject({
//         Body: buffer,
//         Bucket: BUCKET,
//         ContentType: 'image/webp',
//         CacheControl: 'max-age=31536000',
//         Key: 'table-cushion_100x100.webp',
//         StorageClass: 'STANDARD'
//     }).promise()
//     // even if there is exception in saving the object we send back the generated
//     // image back to viewer below
//   })
// .catch(error => console.log("Error", error))
