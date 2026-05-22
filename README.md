# QQ群聊消息分析

作者：untarz

Manual current-conversation group analysis plugin for ElymBot Plugin v2.

## Commands

- `/群分析-帮助`: show command list
- `/群分析-完整`: full report
- `/群分析-统计`: local statistics only, no LLM call
- `/群分析-话题`: topic analysis
- `/群分析-金句`: quote extraction
- `/群分析-用户`: user style analysis
- `/群分析-质量`: chat quality review

## Scope

This V1 only analyzes the conversation where the command is triggered. It uses
`hostApi.conversation.history({ limit: 100 })`, so it can read at most the latest
100 messages exposed by the host.

It does not implement scheduled tasks, multi-group dispatch, QQ group file or
album upload, dynamic image rendering, or HTML report file generation.

## Required Host Permissions

- `conversation_read`
- `provider_read`
- `call_model`

## Files

- `manifest.json`
- `android-plugin.json`
- `_conf_schema.json`
- `schemas/settings-schema.json`
- `runtime/bootstrap.js`
