// Thumbnail generator taken from AWS Tutorial and modified a little.
// This explains the old JavaScript.

var async = require('async');
var AWS = require('aws-sdk');
var gm = require('gm').subClass({ imageMagick: true });
var util = require('util');

var MAX_WIDTH = 100;
var MAX_HEIGHT = 100;

var s3 = new AWS.S3();

exports.handler = function(event, context, callback) {
  console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
  var sourceBucket = event.Records[0].s3.bucket.name;
  var sourceKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  var destinationBucket = sourceBucket + "-thumbnails";
  var destinationKey = sourceKey + "/1x.jpg";

  // Sanity check: validate that source and destination are different buckets.
  if (sourceBucket === destinationBucket) {
    callback("Source and destination buckets are the same.");
    return;
  }

  // Infer the image type.
  var typeMatch = sourceKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    callback("Could not determine the image type.");
    return;
  }
  var imageType = typeMatch[1].toLowerCase();
  if (["jpg", "png", "tiff", "pdf"].indexOf(imageType) < 0) {
    callback('Unsupported image type: ${imageType}');
    return;
  }

  // Download the image from S3, transform, and upload to a different S3 bucket.
  async.waterfall([
    function download(next) {
      s3.getObject({
          Bucket: sourceBucket,
          Key: sourceKey
        },
        next);
      },

    function transform(response, next) {
      gm(response.Body).resize(200, 200).toBuffer(imageType, function(err, buffer) {
        if (err) {
          next(err);
        } else {
          next(null, response.ContentType, buffer);
        }
      });
    },

    function upload(contentType, data, next) {
      s3.putObject({
          Bucket: destinationBucket,
          Key: destinationKey,
          Body: data,
          ContentType: contentType
        },
        next);
      }
    ], function (err) {
      if (err) {
        console.error(
          'Unable to resize ' + sourceBucket + '/' + sourceKey +
          ' and upload to ' + destinationBucket + '/' + destinationKey +
          ' due to an error: ' + err
        );
      } else {
        console.log(
          'Successfully resized ' + sourceBucket + '/' + sourceKey +
          ' and uploaded to ' + destinationBucket + '/' + destinationKey
        );
      }

      callback(null, "message");
    }
  );
};
