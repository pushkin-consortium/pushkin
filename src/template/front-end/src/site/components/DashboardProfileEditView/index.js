import React from 'react';
import { Button } from 'react-bootstrap';
import s from './styles.css';

class DashboardProfileEditView extends React.Component {
  render() {
    return (
      <div className={s.editview}>
        <form onSubmit={e => this.props.handleSubmit(e)}>
          <div>
            <label>Set a nickname</label>
            <input
              className={s.nickname}
              type="text"
              defaultValue={this.props.profile.nickname}
              onBlur={e => this.props.handleChangeUserMetaData('nickname', e)}
            />
          </div>
          <div>
            <label>Set a subscription email</label>
            <input
              className={s.nickname}
              type="text"
              defaultValue={this.props.profile.userEmail}
              onBlur={e => this.props.handleChangeUserMetaData('userEmail', e)}
            />
          </div>
          <div>
            <label>Update your profile picture</label>
            <input
              style={{ display: 'flex' }}
              className={s.imageupload}
              type="file"
              onChange={e => this.props.handleImageChange(e)}
            />
          </div>
        </form>
        <div style={{ marginTop: 20 }}>
          {this.props.imagePreviewUrl && (
            <img className={s.imagepreview} src={this.props.imagePreviewUrl} />
          )}
          {!this.props.imagePreviewUrl && <p>Please select a picture</p>}
        </div>
        <Button
          className="btn btn-primary"
          type="submit"
          onClick={e => this.props.handleSubmit(e)}
          disabled={this.props.disabled}
        >
          Submit
        </Button>
      </div>
    );
  }
}
export default DashboardProfileEditView;
