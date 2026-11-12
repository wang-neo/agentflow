#!/bin/bash
# daemon 保活包装：异常退出 10s 后拉起（launchd 不可用环境的替代）
while true; do
  /Users/mac/.workbuddy/binaries/node/versions/22.22.2-6/bin/node /Users/mac/.agentflow/daemon/slack-daemon.js
  sleep 10
done
