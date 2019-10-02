// src/App.js
import React, { Component } from 'react';

import { Provider, connect } from 'react-redux';

import ChatUI from './components/ChatUI';
import LoginUI from './components/LoginUI';

const loggerMiddleware = createLogger();

const store = createStore(
  rootReducer,
  applyMiddleware(
    thunkMiddleware,
    loggerMiddleware
  )
);

const LoginOrChat = connect(
  (state) => ({
    authorized: state.user.authorized
  })
)(({ authorized }) => {
  if (authorized) {
    return (<ChatUI />);
  } else {
    return (<LoginUI />);
  }
});
class App extends Component {
  render() {
    return (
      <Provider store={store}>
        <LoginOrChat />
      </Provider>
    );
  }
}