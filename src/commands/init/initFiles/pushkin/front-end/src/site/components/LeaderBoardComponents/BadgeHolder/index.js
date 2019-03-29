import React from 'react';
import ReactDOM from 'react-dom';
import { Button } from 'react-bootstrap';
import s from './styles.css';
import {
  Row,
  Col,
  Image,
  ProgressBar,
  Table,
  Panel,
  Alert
} from 'react-bootstrap';
import Badges from '../Badges/index.js';
// import VideoModal from '../VerbcornerLeaderboard/model.js';
import BadgeNotificationModal from '../../BadgeNotificationModal/model.js';

const BADGEURLDictionary = { '0': '' };
/* 
const BADGEURLDictionary = {
  "5" : require('../../../img/quiz_badges/Blood_Magic/25.jpg'),
  "10": require('../../../img/quiz_badges/Blood_Magic/50.jpg'),
  "15": require('../../../img/quiz_badges/Blood_Magic/100.jpg'),
  "20": require('../../../img/quiz_badges/Blood_Magic/150.jpg'),
}
*/



/* this stuff ought to be put into the accompanying styles.css file */
/* styles should not be specified inline in the way that they often are here.
 * it's not modularized at all and is tedious to change. */
var badgeModal = {
  width: '100%',
  height: '100%',
  border: '2px solid lightGrey'
};

var badgePanel = {
  position: 'absolute',
  width: '100%',
  height: '100%'
};

var badgeDisplay = {
  width: '3.2em',
  marginRight: '0.5em'
};

var badgeNotificationModal = {
  width: '100%',
  height: "60%",
  border: '2px solid lightGrey',

};

var badgeNotificationPanel = {
  position: 'absolute',
  width: '100%',
  height: '100%'
}

class BadgeHolder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isBadgeHolderOpen: false,
      badgeEarned: false,
      handleUpdating: 0
    };
  }

  showBadgeHolder = () => {
    return (
      <VideoModal
        style={badgeModal}
        id="VideoModal"
        isOpen={this.state.isBadgeHolderOpen}
      >
        <Panel style={badgePanel}>
          <Panel.Body
            style={{
              position: 'absolute',
              top: '20%',
              margin: 'auto',
              textAlign: 'center'
            }}
          >
          {this.renderBadges(this.props.count, s.badgeDisplay)}
          </Panel.Body>
          {
            <Button
              style={{
                position: 'absolute',
                top: '94%',
                fontFamily: 'serif'
              }}
              onClick={this.showBadges}
              id="video"
              bsStyle="warning"
              bsSize="small"
              block
            >
              Close Badge Holder
            </Button>
          }
        </Panel>
      </VideoModal>
    );
  };

  showBadges = () => {
    this.setState({ isBadgeHolderOpen: !this.state.isBadgeHolderOpen });
  };

  notifyBadgeEarned = () => {
    return (
      <BadgeNotificationModal
        style={badgeNotificationModal}
        id="VideoModal"
        isOpen={this.state.badgeEarned}
      >
        <Panel style={badgeNotificationPanel}>
          <div>`Congratulations, that's ${this.props.count} questions answered!`</div>
          <div>Keep it up!</div>
          <Panel.Body
            style={{
              position: 'absolute',
              top: '18%',
              margin: 'auto',
              textAlign: 'center'
            }}
          >
          
          <img
            src={BADGEURLDictionary[String(this.props.count)]}
            width="85%"
          />
          </Panel.Body>
          {
            <Button
              style={{
                position: 'absolute',
                top: '91%',
              }}
              onClick={this.showBadgesNotification}
              id="video"
              bsStyle="warning"
              bsSize="small"
              block
            >
              Awesome!
            </Button>
          }
        </Panel>
      </BadgeNotificationModal>
    )}


  showBadgesNotification = () => {
    this.setState({ badgeEarned: !this.state.badgeEarned });
  };

  renderBadges(count, className) {
    const badgesToShow = Math.floor( count / 5);
    // console.log(BADGEURLS.slice(0, badgesToShow))

    return(
      <div>
      {BADGEURLS.slice(0, badgesToShow).map((url, i) => {
        return(
          <img
            key={i}
            className={className}
            src={url}
          />
        )
      })}

      </div>
      )
  }

  // This section is for showing badge earning notifications by using component did update. 
  // Badges are earned for every five successfully answered questions. 

  componentDidUpdate(prevProps, prevState){
    // console.log(prevProps.count % 5)

    if((prevProps.count % 5 == 0) && (this.state.handleUpdating == 0) && (prevProps.count != 0)){
      this.setState({ badgeEarned: !this.state.badgeEarned });
      this.setState({ handleUpdating: 1})
      console.log("Firing pen")
    }
    
    if((prevProps.count % 5 != 0) && (this.state.handleUpdating == 1) && (prevProps.count != 0)){
      this.setState({ handleUpdating: 0})
    }
  }

  render() {

    const panelInstance = (
      <Panel onClick={this.showBadges}>
        <Panel.Body>
        {this.renderBadges(this.props.count,s.badge)}
        </Panel.Body>
      </Panel>
    );
    return (
      <div>
        {<div>{this.notifyBadgeEarned()}</div>}
        {<div>{this.showBadgeHolder()}</div>}
        <div>{panelInstance}</div>
      </div>
    );
  }
}
export default BadgeHolder;
