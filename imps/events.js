{
  'connect' : {
    'server' :[
                'welcome', 
                'list_rooms']
  },

  'join_room' : {
    'server' :[
                'notice_others',
                'list_roommates',
                'check_room_master',
                'check_role'],
    'client' : [
                'join_room',
                'sync_player_stat']
  },
  'leave_room' : {
    'server' : [
                'notice_others',
                'check_ready_stat',
                'list_rooms'],
    'client' : [
                'leave_room']
  },
  'ready_for_game' : {
    'server' : [
                'notice_others',
                'notice_ready_stat'],
    'client' : [
                'block_leaving']
  },

  'start_game' : {
    'server' : [
                'check_ready_stat',
                'game_start',
                'change_room_stat'],
    'client' : [ 
                'game_start',
                'sync_room_stat']
  },

  'start_vote' : {
    'server' : [
                'check_player_stat',
                'start_vote'],
    'client' : ['start_vote']
  },
  'end_vote' : {
    'server' : ['end_vote', 
                'check_player_stat',
                'check_vote_end'],
    'client' : ['end_vote']
  },
  'player_dead' : {
    'server' : [
                'notice_others',
                'change_player_stat'],
    'client' : [
                'sync_player_stat']
  },
  'game_end' : {
    'server' : [
                'game_end',
                'change_room_stat',
                'change_player_stat'],

  },
  'chats' : {
    'server' : [
                'check_player_stat',
                'notice_others']
  }
};