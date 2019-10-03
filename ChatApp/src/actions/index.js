import firebase from '../firebase';
import DeviceInfo from 'react-native-device-info';
import FCM, { FCMEvent, NotificationType, WillPresentNotificationResult, RemoteNotificationResult } from 'react-native-fcm';
import { Platform } from 'react-native';

export const addMessage = (msg) => ({
  type: 'ADD_MESSAGE',
  ...msg
});

export const sendMessage = (text, user) => {
  return function (dispatch) {
    let msg = {
      text: text,
      time: Date.now(),
      author: {
        name: user.name,
        avatar: user.avatar
      }
    };

    const newMsgRef = firebase.database()
      .ref('messages')
      .push();
    msg.id = newMsgRef.key;
    newMsgRef.set(msg);

    dispatch(addMessage(msg));
  };
};

export const startFetchingMessages = () => ({
  type: 'START_FETCHING_MESSAGES'
});

export const receivedMessages = () => ({
  type: 'RECEIVED_MESSAGES',
  receivedAt: Date.now()
});

export const fetchMessages = () => {
  return function (dispatch) {
    dispatch(startFetchingMessages());

    firebase.database()
      .ref('messages')
      .orderByKey()
      .limitToLast(20)
      .on('value', (snapshot) => {
        // gets around Redux panicking about actions in reducers
        setTimeout(() => {
          const messages = snapshot.val() || [];

          dispatch(receiveMessages(messages))
        }, 0);
      });
  }
}

export const receiveMessages = (messages) => {
  return function (dispatch) {
    Object.values(messages).forEach(msg => dispatch(addMessage(msg)));

    dispatch(receivedMessages());
  }
}

export const updateMessagesHeight = (event) => {
  const layout = event.nativeEvent.layout;

  return {
    type: 'UPDATE_MESSAGES_HEIGHT',
    height: layout.height
  }
}



//
// User actions
//

export const setUserName = (name) => ({
  type: 'SET_USER_NAME',
  name
});

export const setUserAvatar = (avatar) => ({
  type: 'SET_USER_AVATAR',
  avatar: avatar && avatar.length > 0 ? avatar : 'https://abs.twimg.com/sticky/default_profile_images/default_profile_3_400x400.png'
});

export const login = () => {
  return async function (dispatch, getState) {
    dispatch(startAuthorizing());
    let device_id = '';
    await DeviceInfo.getUniqueId().then(val => {
      device_id = val
    });
    firebase.auth()
      .signInAnonymously()
      .then(() => {
        debugger
        const { name, avatar } = getState().user;

        firebase.database()
          .ref(`users/${device_id}`)
          .set({
            name,
            avatar
          });

        startChatting(dispatch);
      });
  }
}

export const checkUserExists = () => {
  return async function (dispatch) {
    dispatch(startAuthorizing());
    await DeviceInfo.getUniqueId().then(val => {
      id = val
    });
    firebase.auth()
      .signInAnonymously()
      .then(() => {
        firebase.database()
          .ref(`users/${id}`)
          .once('value', (snapshot) => {
            const val = snapshot.val();

            if (val === null) {
              dispatch(userNoExist());
            } else {
              dispatch(setUserName(val.name));
              dispatch(setUserAvatar(val.avatar));
              startChatting(dispatch);
            }
          })
      })
      .catch(err => {
        console.log("singIn Error: " + err)
      })
  }
}

const startChatting = function (dispatch) {
  dispatch(userAuthorized());
  dispatch(fetchMessages());

  FCM.requestPermissions();
  FCM.getFCMToken()
    .then(token => {
      console.log(token)
    });
  FCM.subscribeToTopic('secret-chatroom');

  FCM.on(FCMEvent.Notification, async (notif) => {
    console.log(notif);

    if (Platform.OS === 'ios') {
      switch (notif._notificationType) {
        case NotificationType.Remote:
          notif.finish(RemoteNotificationResult.NewData); //other types available: RemoteNotificationResult.NewData, RemoteNotificationResult.ResultFailed
          break;
        case NotificationType.NotificationResponse:
          notif.finish();
          break;
        case NotificationType.WillPresent:
          notif.finish(WillPresentNotificationResult.All); //other types available: WillPresentNotificationResult.None
          break;
      }
    }
  });

  FCM.on(FCMEvent.RefreshToken, token => {
    console.log(token);
  });
}

export const startAuthorizing = () => ({
  type: 'USER_START_AUTHORIZING'
});

export const userAuthorized = () => ({
  type: 'USER_AUTHORIZED'
});

export const userNoExist = () => ({
  type: 'USER_NO_EXIST'
});