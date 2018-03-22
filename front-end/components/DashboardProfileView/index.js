import React from 'react';
import { Button } from 'react-bootstrap';
import s from './styles.css';

class DashboardProfileView extends React.Component {
  render() {
    return (
      <div>
        <h2 style={{ marginTop: 0 }}>{this.props.nickname}</h2>
        <div>
          <label>Subscription email: {this.props.userEmail}</label>
        </div>
        <div>
          <img className={s.imagepreview} src={this.props.image} />
        </div>
        <Button
          style={{ width: 75 }}
          className="btn btn-primary"
          onClick={this.props.setEditView}
        >
          Edit
        </Button>
      </div>
    );
  }
}
export default DashboardProfileView;
