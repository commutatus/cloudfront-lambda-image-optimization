const userAgent = require('useragent')
const path = require('path')
const querystring = require('querystring');

const variables = {
  allowedDimension : [ {w:100,h:100}, {w:200,h:200}, {w:300,h:300}, {w:400,h:400} ],
  defaultDimension : {w:200,h:200},
  variance: 20,
  webpExtension: 'webp'
};

exports.handler = async (event, context, callback) => {
  const request = event.Records[0].cf.request
  const headers = request.headers

  // parse the querystrings key-value pairs. In our case it would be d=100x100
  const params = querystring.parse(request.querystring);
  console.log('Query String', request.querystring)

  const userAgentString = headers['user-agent'] && headers['user-agent'][0] ? headers['user-agent'][0].value : null
  const agent = userAgent.lookup(userAgentString)

  const browsersToInclude = [
    { browser: 'Chrome', version: 23 },
    { browser: 'Opera', version: 15 },
    { browser: 'Android', version: 53 },
    { browser: 'Chrome Mobile', version: 55 },
    { browser: 'Opera Mobile', version: 37 },
    { browser: 'UC Browser', version: 11 },
    { browser: 'Samsung Internet', version: 4 }
  ]

  const supportingBrowser = browsersToInclude
    .find(browser => browser.browser === agent.family && agent.major >= browser.version)
  let fwdUri = request.uri
  request.headers['originalKey'] = [{
    key: 'originalKey',
    value: fwdUri.substring(1)
  }]

  if (supportingBrowser && params.d ) {
    console.log("Inside the browser")
    const fileFormat = path.extname(request.uri).replace('.', '')
    // read the dimension parameter value = width x height and split it by 'x'
    const dimensionMatch = params.d.split("x");

    // set the width and height parameters
    let width = dimensionMatch[0];
    let height = dimensionMatch[1];

    const match = fwdUri.match(/(.*)\/(.*)\.(.*)/);

    let prefix = match[1];
    let imageName = match[2];
    let extension = match[3];

    // define variable to be set to true if requested dimension is allowed.
    let matchFound = false;

    // calculate the acceptable variance. If image dimension is 105 and is within acceptable
    // range, then in our case, the dimension would be corrected to 100.
    let variancePercent = (variables.variance/100);

    for (let dimension of variables.allowedDimension) {
        let minWidth = dimension.w - (dimension.w * variancePercent);
        let maxWidth = dimension.w + (dimension.w * variancePercent);
        if(width >= minWidth && width <= maxWidth){
            width = dimension.w;
            height = dimension.h;
            matchFound = true;
            break;
        }
    }

    // read the accept header to determine if webP is supported.
    let accept = headers['accept']?headers['accept'][0].value:"";

    let url = [];
    // build the new uri to be forwarded upstream
    url.push(prefix);
    url.push(width+"x"+height);

    // check support for webp
    if (accept.includes(variables.webpExtension)) {
        url.push(variables.webpExtension);
    }
    else{
        url.push(extension);
    }
    url.push(imageName+"."+extension);
    request.headers['dimensionIncluded'] = [{
      key: 'dimensionIncluded',
      value: 'true'
    }]
    // fwdUri = url.join("/");
    fwdUri = fwdUri.replace(/(\.jpg|\.png|\.jpeg)$/g, '_'+width+'x'+height+'.webp')
    // final modified url is of format image_100x100.webp
    request.uri = fwdUri;
    request.query = request.querystring
    console.log('Final Request', request)

    return callback(null, request);

  } else if (supportingBrowser) {
    request.headers['dimensionIncluded'] = [{
      key: 'dimensionIncluded',
      value: 'false'
    }]
    fwdUri = fwdUri.replace(/(\.jpg|\.png|\.jpeg)$/g, '.webp')
    // final modified url is of format image.webp
    request.uri = fwdUri;
    request.query = request.querystring
    console.log('Final Request if params not present', request)

    return callback(null, request);
  } else {
    request.headers['dimensionIncluded'] = [{
      key: 'dimensionIncluded',
      value: 'false'
    }]
  }
  console.log("Not inside the browser")
  return callback(null, request)
}
