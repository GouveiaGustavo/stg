const fs = require('fs');
const Env = use('Env');
const AWS = use('aws-sdk');
const util = require('util');
const awsID = Env.get('AWS_S3_ACCESS_KEY_ID');
const awsSecret = Env.get('AWS_S3_SECRET_ACCESS_KEY');
const awsBucketName = Env.get('AWS_S3_BUCKET_NAME');
const awsRegion = Env.get('AWS_S3_BUCKET_REGION');
let awsS3Client;

//https://016379543436.signin.aws.amazon.com/console
class AwsDriver {
  constructor() {
    AWS.config.update({
      accessKeyId: awsID,
      secretAccessKey: awsSecret,
      region: awsRegion,
    });

    awsS3Client = new AWS.S3();
  }

  async upload(path_file) {
    const fileContent = fs.createReadStream(path_file);

    const params = {
      Bucket: awsBucketName,
      Key: `${path_file}`,
      Body: fileContent,
      ACL: 'public-read',
    };

    return new Promise((resolve, reject) =>
      awsS3Client.upload(params, (err, data) => (err ? reject(err) : resolve(data))),
    );
  }

  async getFileStreamData(key) {
    const getObjectFromBucket = util.promisify(awsS3Client.getObject).bind(awsS3Client);

    let streamFile = await getObjectFromBucket({
      Bucket: awsBucketName,
      Key: key,
    });

    return streamFile;
  }

  async deleteFile(key) {
    const deleteObjectFromBucket = util.promisify(awsS3Client.deleteObject).bind(awsS3Client);

    let streamFile = await deleteObjectFromBucket({
      Bucket: awsBucketName,
      Key: key,
    });

    return streamFile;
  }
}

module.exports = AwsDriver;
