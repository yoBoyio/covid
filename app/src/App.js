import React from 'react';
import PropTypes from 'prop-types';
import { HashRouter as Router } from 'react-router-dom';

import Storage from 'react-simple-storage';
import { TranslatorProvider, useTranslate } from 'react-translate';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import available from './i18n/available';

import ErrorCatcher from './ErrorCatcher';
import Dashboard from './Dashboard';
import { WidgetsList } from './Widget';

// App Helmet: Controls HTML <head> elements with SideEffect
// - Set a default title and title template, translated
const AppHelmet = (props) => {
  const t = useTranslate("App");
  const title = t("Covid Data Refactored");
  return (
    <Helmet
      titleTemplate={ `%s | ${ title }` }
      defaultTitle={ title }
    >
      <html lang={ props.language } />
    </Helmet>
  );
}

// Concentrate all providers (4) used in the app into a single component
const AppProviders = (props) => {
  return (
    <TranslatorProvider translations={ props.translations }>
      <HelmetProvider>
        <AppHelmet language={ props.language } />
        <Router>
          <div className='App' id='router-container'>
            { props.children }
          </div>
        </Router>
      </HelmetProvider>
    </TranslatorProvider>
  );
}

class App extends React.Component {

  constructor() {
    super();

    // Fix bad browser encoding HASH
    const decoded = decodeURIComponent(global.location.hash);
    if ( decoded !==  '' && decoded !== global.location.hash ) {
      const hash = decoded.replace(/[^#]*(#.*)$/, '$1');
      global.location.replace(hash);
    }

    this.registration = false;
    this.state = {
      initializing: true,
      newServiceWorkerDetected: false,
      language: available.hasOwnProperty(navigator.language) ? navigator.language : 'ca-es',
      theme: false, // Use defined by user in browser
    };
  }

  componentDidMount() {
    // Receive message from index.js when a new service worker has been detected
    document.addEventListener('onNewServiceWorker', this.handleNewServiceWorker);
  }

  componentWillUnmount() {
    // Remove event listener
    document.removeEventListener('onNewServiceWorker', this.handleNewServiceWorker);
  }

  // When new serviceWorker is accepted, save the registration object
  // and change own state, which will be passed to Dashboard to let the user upgrade
  handleNewServiceWorker = (event) => {
    this.registration = event.detail.registration;
    this.setState({
      newServiceWorkerDetected: true,
    });
  }

  // Once the user accepts to update, call index.js callback
  handleLoadNewServiceWorkerAccept = () => this.props.onLoadNewServiceWorkerAccept(this.registration);

  handleLanguageChange = (language) => this.setState({ language });

  render() {
    const { newServiceWorkerDetected, language, theme } = this.state;
    const translations = available[language];

    return (
      <AppProviders { ...{
          translations,
          language,
        }}
      >

        {/* Persistent state saver into localStorage */}
        <Storage
          parent={ this }
          prefix='App'
          blacklist={ ['newServiceWorkerDetected','initializing'] }
          onParentStateHydrated={ () => this.setState({ initializing: false }) }
        />

        {/* Shows the app, with ErrorBoundaries */}
        <ErrorCatcher origin='Dashboard'>
          <Dashboard
            // Handle App update acceptance by user
            newServiceWorkerDetected={ newServiceWorkerDetected }
            onLoadNewServiceWorkerAccept={ this.handleLoadNewServiceWorkerAccept }
            // Use language and handle its change
            language={ language }
            onLanguageChange={ this.handleLanguageChange }
            // Pass theme
            theme={ theme }
          >
            <ErrorCatcher origin='WidgetsList'>
              <WidgetsList />
            </ErrorCatcher>
          </Dashboard>
        </ErrorCatcher>

      </AppProviders>
    );
  }
}

App.propTypes = {
  onLoadNewServiceWorkerAccept: PropTypes.func.isRequired,
};

export default App;
