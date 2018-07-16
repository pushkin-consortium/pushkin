#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='syncWebsite'
pushkin_conf_dir="$PWD"/.pushkin

source "${pushkin_conf_dir}/pushkin_config_vars.sh"
source "${pushkin_conf_dir}/bin/core.sh"
source "${pushkin_env_file}"
set +e

##############################################
# variables
# WORKING DIR: pushkin root
##############################################
set -e

log () { echo "${boldFont}${scriptName}:${normalFont} ${1}"; }
die () { echo "${boldFont}${scriptName}:${normalFont} ${1}"; exit 1; }

dist="${pushkin_front_end_dist}"
bucket="${s3_bucket_name}"

set +e

##############################################
# start
##############################################

log "syncing front_end dist (${dist}) with aws bucket '${bucket}'"

aws s3 sync "./${dist}" s3://${bucket}

log "done"
