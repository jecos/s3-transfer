![](https://github.com/Ferlab-Ste-Justine/s3-transfer/workflows/Build/badge.svg)
![](https://github.com/Ferlab-Ste-Justine/s3-transfer/workflows/Publish%20Image%20Using%20Commit%20Hash/badge.svg)

# About

This docker image is meant to help transfer files between any of the following:
- A filesystem
- S3 compatible object stores

# Tested Implementations

The image has been validated with the following S3 implementations:
- AWS
- Digital Ocean
- Ceph
- Minio

# Limitations

## Filesystem

The following functionalities are not yet implemented for the filesystem:
- Having the filesystem as the destination (currently, it is only supported as a source)
- Special characters: No escaping is currently perform on file paths

## Absolute Path

Your mileage if you specify an absolute path to upload from a local filesystem may vary:

- It worked perfectly in AWS and Digital Ocean
- In Openstack, it worked perfectly from the API, but the Openstack Dashboard would not list the objects
- Minio simply refused to upload objects whose key started with the */* character

It probably makes more sense to upload a relative path anyways.

## Usage

The container runs on the **/opt** directory by default. Any directory you want to transfer files from you be mapped as a volume under that directory.

The **CONCURRENCY** environment variable specifies the maximum number of files that should be uploaded concurrently at any given time.

The **CONFIG_PATH** environment variable specifies where the configuration file is located.

The configuration file specifies the source and destination of the files to transfer. For configuration examples, look under the **demo-configs** directory.

## Example

There are various examples that need to be tweaked a little to function.

The orchestration is in the **docker-compose.yml** file.

There are configuration files for various scenario under **demo-configs**.

You can edit the **CONFIG_PATH** in the **docker-compose.yml** to pick which configuration file you want to use (the configurations that copy from the filesystem will copy the code directory of this project in an s3 bucket).

After that, you want to change the **bucket** entry(ies) in your configuration file to point to the s3 buckets you want to use.

And then, you need to edit any credential file that is pointed at in the configuration with your access credentials.

### Using Minio

If you want to run the example with **Minio**, you have to start minio, by typing: ```docker-compose up -d minio```. 

After that, you need to create a **test** bucket in minio (whose gui you can open in your browser on **localhost** on port **9000**). 

The credentials are already set in the docker-compose file to be **myaccess** and **mysecret** so you don't need to change the **credentials_minio.json** file to access minio (they are already set to the value of the docker-compose file).

