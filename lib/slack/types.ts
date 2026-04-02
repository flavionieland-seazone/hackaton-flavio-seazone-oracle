export interface SlackMessageEvent {
  type: 'message' | 'app_mention'
  user?: string
  bot_id?: string
  subtype?: string
  text: string
  channel: string
  channel_type?: 'im' | 'mpim' | 'channel' | 'group'
  ts: string
  thread_ts?: string
  event_ts?: string
}

export interface SlackEventPayload {
  type: 'event_callback' | 'url_verification'
  event?: SlackMessageEvent
  challenge?: string
  team_id?: string
  event_id?: string
}
