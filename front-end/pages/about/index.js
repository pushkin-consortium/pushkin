/**
 * React Static Boilerplate
 * https://github.com/kriasoft/react-static-boilerplate
 *
 * Copyright © 2015-present Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import * as b from 'react-bootstrap';
import React from 'react';
import s from './styles.css';

class AboutPage extends React.Component {
  constructor() {
    super();
    this.state = {
      people: false,
      funding: false,
      media: false,
      links: false,
      contact: false,
      updates: false
    };
    this.updateDimensions = this.updateDimensions.bind(this);
  }

  componentWillMount() {
    window.addEventListener('resize', this.updateDimensions);
  }

  componentDidMount() {
    document.title = 'Games With Words';
    this.updateDimensions();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateDimensions);
  }

  updateDimensions() {
    if (window.innerWidth < 992) {
      this.setState({
        mobile: true,
        border: { borderBottom: 'dashed #a9a9a9' }
      });
    } else {
      this.setState({
        mobile: false,
        border: {
          borderRight: 'dashed #a9a9a9',
          minHeight: this.refs.list.offsetHeight + 20
        }
      });
    }
  }

  render() {
    return (
      <div style={{ marginLeft: '20px', marginRight: '20px' }}>
        <b.Image
          style={{ display: 'none' }}
          src={require('../../img/favicon.ico')}
          onLoad={this.updateDimensions}
        />
        <div>
          <b.Row>
            <b.Col xs={12} md={9} style={this.state.border}>
              <div
                className={s.blurb}
                style={
                  this.state.mobile
                    ? null
                    : { marginRight: '20px', fontSize: '18px' }
                }
              >
                <p className={s.sub}>
                  GamesWithWords.org is a Web-based research laboratory. The
                  quizzes and projects are research studies probing the nature
                  of language. Learn more about the research and the people
                  involved by clicking on the links on the right. To read
                  reports of completed studies, choose{' '}
                  <a href="/findings">findings</a> from the menu bar.
                </p>
                <p className={s.sub}>
                  To get updates about all GamesWithWords.org projects,
                  including announcements of publications based on this
                  research, click{' '}
                  <a onTouchTap={() => this.setState({ updates: true })}>
                    here
                  </a>.
                </p>
                <p className={s.sub}>
                  Through November 2009, GamesWithWords.org was called
                  CogLangLab.org. Empirical research found that the older name
                  was too hard to say.
                </p>
              </div>
            </b.Col>
            <b.Col xs={12} md={3}>
              <div style={{ marginTop: '20px' }} ref="list">
                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ people: true })}
                  >
                    People
                  </h1>
                </a>
                <b.Modal show={this.state.people}>
                  <b.Modal.Header>
                    <span style={{ float: 'right' }}>
                      <a
                        style={{ color: '#000000', fontSize: '17px' }}
                        onTouchTap={() => this.setState({ people: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>People</b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      <a href="http://joshuakhartshorne.org">
                        <b>Joshua Hartshorne</b>
                      </a>
                      <b> - Principal Investigator</b>
                    </p>
                    <p>
                      Joshua Hartshorne is an assistant professor of psychology
                      at{' '}
                      <a href="http://www.bc.edu/schools/cas/psych.html">
                        Boston College
                      </a>, and the founder of GamesWithWords.org. He is hroadly
                      interested in human behavior, with a particular interest
                      in language and inference. By &quot;inference,&quot; he
                      means the application of learned information to make
                      predictions about a novel situation.{' '}
                    </p>
                    <hr />
                    <p>
                      <b>Claire Bonial</b>
                    </p>
                    <p>
                      Claire Bonial is a graduate student at the University of
                      Colorado-Boulder and is a collaborator on the{' '}
                      <a href="/VerbCorner">VerbCorner Project.</a>
                    </p>
                    <hr />
                    <p>
                      <b>Amy Geojo</b>
                    </p>
                    <p>
                      Amy Geojo is a graduate student in the Psychology
                      Department at Harvard University. She collaborated with
                      Josh on the<a href="/GorpTest/index.html"> Gorp Test</a>.
                    </p>
                    <hr />
                    <p>
                      <a href="http://www.lauragermine.org/">
                        <b>Laura Germine</b>
                      </a>
                    </p>
                    <p>
                      Laura Germine is a postdoctoral researcher in the
                      Psychiatric and Neurodevelopmental Genetics Unit at MGH,
                      and the developer of{' '}
                      <a href="http://testmyhrain.org">TestMyBrain.org</a>. She
                      collaborated on the{' '}
                      <a href="/MemoryTest/index.html">Memory Test</a>.
                    </p>
                    <hr />
                    <p>
                      <a href="http://www.cmich.edu/academics/humanities_social_behavioral_sciences/CHSBSDepartments/CHSBSPsychology/charge/Pages/default.aspx/People/Tim.html">
                        <b>Timothy Hartshorne</b>
                      </a>
                    </p>
                    <p>
                      Timothy Hartshorne is a professor at Central Michigan
                      University. His primary topic of research is CHARGE
                      Syndrome. He is also interested in Adlerian Psychology. He
                      is collaborating with Josh on the{' '}
                      <a href="BirthOrder/index.html">Birth Order</a> project.
                      Yes, they are related.{' '}
                    </p>
                    <hr />
                    <p>
                      <a href="http://languageandcognition.umd.edu">
                        <b>Yi Ting Huang</b>
                      </a>
                    </p>
                    <p>
                      Yi Ting Huang is a professor in the Department of Hearing
                      and Speech Sciences at the University of Maryland, where
                      she works on the semantics-pragmatics interface,
                      cross-linguistic comparisons, and reading development. She
                      collaborated on{' '}
                      <a href="CollectingFancyArt/index.html">
                        Collecting Fancy Art
                      </a>.
                    </p>
                    <hr />
                    <p>
                      <a href="http://jianglab.psych.umn.edu/webpagefiles/talcv.htm">
                        <b>Tal Makovski</b>
                      </a>
                    </p>
                    <p>
                      Tal Makovski is a post-doctoral fellow at the University
                      of Minnesota, where he works with Yuhong Jiang. Makovski
                      studies visual attention and visual memory. He and Josh
                      have worked on several Web-based experiments studying
                      visual cognition, such as{' '}
                      <a href="http://vacognition.wjh.harvard.edu/Bear">
                        Rapid Reading
                      </a>{' '}
                      and{' '}
                      <a href="http://vacognition.wjh.harvard.edu/STLT">
                        The Video Experiment
                      </a>.
                    </p>
                    <hr />
                    <p>
                      <a href="http://verbs.colorado.edu/~mpalmer/http://verbs.colorado.edu/~mpalmer/">
                        <b>Martha Palmer</b>
                      </a>
                    </p>
                    <p>
                      Martha Palmer is a professor at the University of Colorado
                      and is a collaborator on the{' '}
                      <a href="/VerbCorner/">VerbCorner Project</a>.
                    </p>
                    <hr />
                    <p>
                      <b>Nancy Salem-Hartshorne</b>
                    </p>
                    <p>
                      Nancy Salem-Hartshorne teaches at Central Michigan
                      University. Her research has focused on CHARGE Syndrome.
                      She has also worked extensively on projects that provide
                      support for teachers and families of students with
                      disabilities. She is collaborating with Josh on the{' '}
                      <a href="BirthOrder/index.html">Birth Order</a> project.
                      They are related, too.{' '}
                    </p>
                    <hr />
                    <p>
                      <a href="http://www.wjh.harvard.edu/%7Elds/index.html?snedeker.html">
                        <b>Jesse Snedeker</b>
                      </a>
                    </p>
                    <p>
                      Jesse Snedeker is an Associate Professor at the Harvard
                      University Psychology Department... and Josh's Ph.D.
                      advisor. She studies language development, comprehension,
                      production and representation, particularly at the
                      sentence level and above.
                    </p>
                    <hr />
                    <p>
                      <a href="http://web.mit.edu/timod/www/">
                        <b>Timothy O'Donnell</b>
                      </a>
                    </p>
                    <p>
                      Timothy O'Donnell is a graduate student in the Psychology
                      Department at Harvard University. He specializes in
                      computational modeling of linguistic processes. He
                      collaborated with Josh on{' '}
                      <a href="http://www.coglanglab.org/exparchive.html">
                        Word Sense
                      </a>.{' '}
                    </p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ people: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ funding: true })}
                  >
                    Funding
                  </h1>
                </a>
                <b.Modal show={this.state.funding}>
                  <b.Modal.Header>
                    <span style={{ float: 'right' }}>
                      <a
                        style={{ color: '#000000', fontSize: '17px' }}
                        onTouchTap={() => this.setState({ funding: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>Funding</b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      GamesWithWords.org is currently funding through a start-up
                      grant at Boston College.{' '}
                    </p>
                    <p style={{ marginBottom: '0px' }}>
                      Prior major funding has been provided by:
                    </p>
                    <ul style={{ listStyle: 'none' }}>
                      <li className={s.ul} style={{ marginTop: '22px' }}>
                        The{' '}
                        <a href="http://cbmm.mit.edu/">
                          Center for Brains, Minds, and Machines
                        </a>{' '}
                        (NSF STC CCF-1231216)
                      </li>
                      <li className={s.ul}>
                        The National Institutes of Health{' '}
                        <a href="https://researchtraining.nih.gov/programs/training-grants/T32">
                          Ruth L. Kirschstein National Service Award
                        </a>
                      </li>
                      <li className={s.ul}>
                        The National Science Foundation{' '}
                        <a href="https://www.nsfgrfp.org/">
                          Graduate Research Fellowship Program
                        </a>
                      </li>
                      <li className={s.ul} style={{ marginBottom: '0px' }}>
                        <a href="https://ndseg.asee.org/">
                          The National Defense Science and Engineering Graduate
                          Fellowship
                        </a>
                      </li>
                    </ul>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ funding: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ media: true })}
                  >
                    Media
                  </h1>
                </a>
                <b.Modal show={this.state.media}>
                  <b.Modal.Header>
                    <span style={{ float: 'right' }}>
                      <a
                        style={{ color: '#000000', fontSize: '17px' }}
                        onTouchTap={() => this.setState({ media: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>Media</b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <ul style={{ listStyle: 'none' }}>
                      <li className={s.ulm}>
                        &quot;<a href="http://nymag.com/scienceofus/2016/01/how-easily-distracted-are-you.html">
                          How easily distracted are you?
                        </a>&quot; in New York Magazine.
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://www.smh.com.au/lifestyle/life/knowing-your-place-20140201-31t2g.html">
                          Knowing your place
                        </a>&quot; in the Sydney Morning Herald.
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://scistarter.com/blog/2014/01/verbcorner-window-brain-one-verb-thought-time/">
                          VerbCorner -- A window into the brain one thought at a
                          time
                        </a>,&quot; in SciStarter Blog.
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://www.myfoxboston.com/story/24016381/research-shows-first-born-children-garner-most-success">
                          Research shows first born children garner most success
                        </a>,&quot; an not egregiously accurate TV news segment
                        at Fox 25 Boston.
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://scistarter.com/blog/2013/10/mind-control-concentration-color-understanding-stroop-effect/">
                          Mind control, concentration, and color --
                          understanding the stroop effect
                        </a>,&quot; in SciStarter Blog.
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://scistarter.com/blog/2013/07/games-with-words-play-on/">
                          Play on
                        </a>&quot; in SciStarter blog.
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://www.veryshortlist.com/science/daily.cfm/review/978/Website/memory-test/?tp">
                          Oh, forget it
                        </a>&quot; in Very Short List
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://www.veryshortlist.com/science/daily.cfm/review/686/Website/the-cognition-and-language-laboratory/?tp">
                          A smart way to feel dumb
                        </a>&quot; in Very Short List{' '}
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://tierneylab.blogs.nytimes.com/2007/06/22/how-many-memories-fit-in-your-brain/">
                          How many memories fit in your brain?
                        </a>&quot; in TierneyLab
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://alphabitch7.blogspot.com/2007/08/its-not-friday-but-here-are-some.html">
                          It's not Friday, but here are some interesting quizzes
                        </a>&quot; in Alphabitch7{' '}
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://laurafreberg.com/blog/?p=262">
                          Update on Joshua Hartshorne's research
                        </a>&quot; in Laura's Psychology Blog
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://skepchick.org/blog/?p=560">
                          Waste time at work for science!
                        </a>&quot; in Memoirs of a Skepchick{' '}
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://blogsci.com/science/you-cant-remember-much-and-i-can-prove-it">
                          You can't remember much, and I can prove it
                        </a>&quot; in BlogSci.com
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://www.alphadictionary.com/blog/?p=125">
                          So what is Reading, Anyway
                        </a>&quot; in Dr. Goodword's Language Blog
                      </li>
                      <li className={s.ulm}>
                        <a href="http://www.newscientist.com/blog/shortsharpscience/2007/03/virtual-labs-is-there-wisdom-in-crowd.html">
                          &quot;Virtual Labs&quot;
                        </a>{' '}
                        in the New Scientist Magazine blog.{' '}
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://www.neuralgourmet.com/node/1605/print">
                          Visual Cognition Online
                        </a>&quot; in NeuralGourmet.com
                      </li>
                      <li className={s.ulm}>
                        <a href="http://dixy0.blogspot.com/2007/03/blog-post_06.html">
                          A blog post in Chinese
                        </a>. Not sure what it says...
                      </li>
                      <li className={s.ulm}>
                        &quot;<a href="http://laurafreberg.com/blog/?p=79">
                          Have you ever wanted to be a research participant?
                        </a>&quot; inLaurafreberg.com
                      </li>
                      <li className={s.ulm} style={{ marginBottom: '0px' }}>
                        &quot;<a href="http://scienceblogs.com/omnibrain/2007/03/online_visual_cognition_experi.php">
                          Online visual cognition experiments
                        </a>,&quot; in Omni Brain{' '}
                      </li>
                    </ul>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ media: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ links: true })}
                  >
                    Links
                  </h1>
                </a>
                <b.Modal show={this.state.links}>
                  <b.Modal.Header>
                    <span style={{ float: 'right' }}>
                      <a
                        style={{ color: '#000000', fontSize: '17px' }}
                        onTouchTap={() => this.setState({ links: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>Links</b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      <b>Affiliated Brick-and-Mortar Laboratories</b>
                      <ul style={{ listStyle: 'none' }}>
                        <li className={s.ul} style={{ marginTop: '15px' }}>
                          <a href="http://cocosci.mit.edu/">
                            Computational Cognitive Science Group
                          </a>, MIT
                        </li>
                        <li className={s.ul}>
                          <a href="https://software.rc.fas.harvard.edu/lds/">
                            Developmental Lab
                          </a>, Harvard University
                        </li>
                        <li className={s.ul}>
                          <a href="http://www.chsbs.cmich.edu/timothy_hartshorne/People/Tim.html">
                            CHARGE Lab
                          </a>, Central Michigan University
                        </li>
                      </ul>
                    </p>
                    <hr />
                    <p style={{ marginTop: '7px' }}>
                      <b>Making Science Less WEIRD network</b>
                      <ul style={{ listStyle: 'none' }}>
                        <li className={s.ul} style={{ marginTop: '15px' }}>
                          <a href="http://labinthewild.org">LabInTheWild.org</a>
                        </li>
                        <li className={s.ul}>
                          <a href="http://www.faceresearch.org">
                            FaceResearch.org
                          </a>
                        </li>
                      </ul>
                    </p>
                    <hr />
                    <p style={{ marginTop: '7px' }}>
                      <b>Lists of Web-Based Experiments</b>
                      <ul style={{ listStyle: 'none' }}>
                        <li className={s.ul} style={{ marginTop: '15px' }}>
                          <a href="http://psych.hanover.edu/Research/exponnet.html">
                            Psychological Research on the Net
                          </a>
                        </li>
                        <li className={s.ul}>
                          <a href="http://www.socialpsychology.org/expts.htm">
                            Online Social Psychology Studies
                          </a>
                        </li>
                        <li className={s.ul}>
                          <a href="http://www.dmoz.org/Science/Social_Sciences/Psychology/Tests_and_Testing/Online_Experiments/">
                            DMOZ's list of online experiments in psychology
                          </a>
                        </li>
                        <li className={s.ul}>
                          <a href="http://www.webexperiment.net">
                            WebExperiment.net
                          </a>
                        </li>
                        <li className={s.ul}>
                          <a href="http://www.onlinepsychresearch.co.uk">
                            Online Psychology Research
                          </a>
                        </li>
                      </ul>
                    </p>
                    <hr />
                    <p style={{ marginTop: '7px' }}>
                      <b>Lists of Citizen Science Projects</b>
                      <ul style={{ listStyle: 'none' }}>
                        <li className={s.ul} style={{ marginTop: '15px' }}>
                          <a href="http://SciStarter.com">SciStarter.com</a>
                        </li>
                        <li className={s.ul}>
                          <a href="http://www.scientificamerican.com/citizen-science/">
                            Scientific American Citizen Science
                          </a>
                        </li>
                        <li className={s.ul} style={{ marginBottom: '0px' }}>
                          <a href="http://CitizenScience.org">
                            CitizenScience.org
                          </a>
                        </li>
                      </ul>
                    </p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ links: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                <a>
                  <h1
                    className={s.title}
                    onTouchTap={() => this.setState({ contact: true })}
                  >
                    Contact
                  </h1>
                </a>
                <b.Modal show={this.state.contact}>
                  <b.Modal.Header>
                    <span style={{ float: 'right' }}>
                      <a
                        style={{ color: '#000000', fontSize: '17px' }}
                        onTouchTap={() => this.setState({ contact: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>Contact</b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <p>
                      If you have questions or concerns about any of the
                      research on this site, or if you would like to request
                      research summaries and reports, please contact Joshua
                      Hartshorne (info@gameswithwords.org).
                    </p>
                    <p>
                      To receive (infrequent) updates about VerbCorner and other
                      GamesWithWords.org projects click{' '}
                      <a onTouchTap={() => this.setState({ updates: true })}>
                        here
                      </a>.
                    </p>
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ contact: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>

                {window.innerWidth < 768 ? (
                  <a href="/updates">
                    <h1 style={{ marginBottom: '50px' }} className={s.title}>
                      Updates
                    </h1>
                  </a>
                ) : (
                  <a>
                    <h1
                      className={s.title}
                      onTouchTap={() => this.setState({ updates: true })}
                    >
                      Updates
                    </h1>
                  </a>
                )}
                <b.Modal show={this.state.updates}>
                  <b.Modal.Header>
                    <span style={{ float: 'right' }}>
                      <a
                        style={{ color: '#000000', fontSize: '17px' }}
                        onTouchTap={() => this.setState({ updates: false })}
                      >
                        x
                      </a>
                    </span>
                    <b.Modal.Title>Updates</b.Modal.Title>
                  </b.Modal.Header>
                  <b.Modal.Body className={s.blurb}>
                    <iframe
                      src="https://gameswithwords.us14.list-manage.com/subscribe?u=0e422ef6ec0edf20f671a1eb5&id=96cab4d244"
                      frameBorder="0"
                      width="90%"
                      height={this.state.mobile ? '1300px' : '1100px'}
                    />
                  </b.Modal.Body>
                  <b.Modal.Footer>
                    <b.Button
                      onTouchTap={() => this.setState({ updates: false })}
                    >
                      Close
                    </b.Button>
                  </b.Modal.Footer>
                </b.Modal>
              </div>
            </b.Col>
          </b.Row>
        </div>
      </div>
    );
  }
}

export default AboutPage;
