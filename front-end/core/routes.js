import { Route, IndexRoute } from 'react-router';
import React from 'react';
import About from '../pages/about/index';
import ErrorPage from '../pages/error/index';
import MobileNotSupported from '../pages/mobile-not-supported/index';
import Findings from '../pages/findings/index';
import HomePage from '../pages/home/index';
import Paths from '../pages/paths/index';
import Projects from '../pages/projects/index';
import Quizzes from '../pages/quizzes/index';
import Archive from '../pages/archive/index';
import QuizWrapper from '../components/QuizWrapper/index';
import Updates from '../pages/updates/index';
import Container from '../pages/containers/container';
import ResultsContainer from '../pages/containers/ResultsContainer';
import Dashboard from '../pages/dashboard/index';
import Forum from '../pages/forum/index';
import ForumQuestion from '../components/ForumPostContent/index';
import Admin from '../pages/admin/index';
import Auth from './auth';

// Pass in a component, and the quiz name
import ForumWrapper from '../components/ForumWrapper/index';

// Any quiz passed to forum wrapper just needs to call `this.props.mountCurrentQuestion` with an object
// that object needs to have a `question property, and a prompt within that at a minimum
// when using jspsych, just pass up the current question
// 
// class  DummyQuiz extends React.Component {
//   advance = () => {
//     const current = {
//       question: {
//         prompt: 'Test Prompt'
//       }
//     }
//     this.props.mountCurrentQuestion(current)
//   }
//   render() { 
//     return (<div>
//       <button onClick={this.advance} >Advance</button>
//       </div>
//     )
//   }
// }
 
import { CONFIG } from '../config';

function isMobile() {
  let check = false;
  (function(a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|dolfin|dolphin|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|iPhone|iPod|playbook|silk/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    )
      check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}

function ensureDesktop(nextState, replace) {
  // if (isMobile()) {
  //   replace({
  //     pathname: '/mobile-not-supported'
  //   });
  // }
}
function authSwitcher() {
  const auth = new Auth();
  return CONFIG.auth ? auth : null;
}
export const routes = (
  <Route
    path="/"
    component={props => (
      <Container auth={authSwitcher()} showForum={CONFIG.forum} {...props} />
    )}
  >
    <IndexRoute component={HomePage} />
    <Route path="/paths" component={Paths} />
    {/*
  <Route path="/quizzes" component={Quizzes}>
    <Route path="/quizzes/listener-quiz" component={listener-quiz} />
  </Route>
  This method of nesting routes is good if you want all children of a particular route to still cause the relevant menu bar tab to remain in the active css configuration when you progress to a child. I.e. /quizzes and /quizzes/listener-quiz both make the quiz tab in the menu bar display as active. Note how below I'll declare the same routes but not nest them, as I don't want the active class to be inherited.
  */}
    <Route path="/quizzes" component={Quizzes} />
    {/* note how we're ensuring that non mobile compatabile quizzes don't open on mobile devices or tablets */}
    <Route
      path="/quizzes/listener-quiz"
      component={ForumWrapper(QuizWrapper, 'listener-quiz', CONFIG)}
      onEnter={ensureDesktop}
    />
    {CONFIG.auth && (
      <Route
        path="/dashboard"
        component={props => <Dashboard config={CONFIG} {...props} />}
      />
    )}
    {CONFIG.forum && (
      <Route path="/forum" component={Forum}>
        <Route path="posts/:id" component={ForumQuestion} />
      </Route>
    )}
    <Route path="/admin" component={Admin} />
    <Route path="/projects" component={Projects} />
    <Route path="/archive" component={Archive} />
    <Route path="/results" component={ResultsContainer} />
    <Route path="/findings" component={Findings} />
    <Route path="/about" component={About} />
    <Route path="/updates" component={Updates} />
    <Route path="/mobile-not-supported" component={MobileNotSupported} />
    <Route path="/error" component={ErrorPage} />
    <Route path="*" component={ErrorPage} />
  </Route>
);
