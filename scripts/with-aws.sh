#!/usr/bin/env bash
# Wrapper that injects temporary AWS credentials from `aws login --profile personal`
# into the env, then execs the rest of the command. See feedback_aws_auth_for_sst.md
# for why this dance is needed.
set -e
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
eval "$(aws configure export-credentials --profile personal --format env)"
export AWS_REGION=us-east-1
exec "$@"
