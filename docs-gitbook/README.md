---
description: >-
  Pushkin provides a customizable, scalable ecosystem for massive online
  psychological experiments
---

# Welcome!

“Getting Started” will get a very simple demo site up and running. The remaining pages explain how to customize your website. Instructions are geared towards someone who ideally has at least some familiarity with JavaScript and React. Sections intended for more experienced programmers who need to understand the guts of Pushkin are labeled under Developers. See the full Table of contents [here](./#table-of-contents).

To get the latest news and updates on Pushkin, sign up for our newsletter [here](https://groups.google.com/g/pushkinjs)

## Table of contents

* **Getting Started**
  * [Installing Pushkin and dependencies](getting-started/installing-pushkin-and-dependencies/)
    * [macOS](getting-started/installing-pushkin-and-dependencies/macos-install.md)
    * Windows 10
   	** [Windows Subsystem for Linux](getting-started/installing-pushkin-and-dependencies/windows-install.md) (preferred)
	** [AWS EC2 Instance](ec2-install.md) 
	* [Ubuntu Linux](getting-started/installing-pushkin-and-dependencies/ubuntu-install.md)
  * [Quickstart](getting-started/quickstart/)
  * [Deploying to AWS](getting-started/deploying-to-aws/README.md)
    * [Install required software.](getting-started/deploying-to-aws/install-required-software.md)
    * [Configure the AWS and ECS CLIs.](getting-started/deploying-to-aws/configure-aws-and-ecs-clis.md)
    * [Register a domain.](getting-started/deploying-to-aws/domain-registration.md)
    * [Set up DockerHub.](getting-started/deploying-to-aws/dockerhub.md)
    * [Initialize AWS Deploy.](getting-started/deploying-to-aws/initializing-aws-deploy.md)

  * [Tutorial: Simple Experiment](getting-started/tutorial-simple-experiment.md)
* **Advanced**
  * [Pushkin CLI](advanced/pushkin-cli.md)
    * [config](advanced/pushkin-cli.md#config)
    * [install site](advanced/pushkin-cli.md#install-site)
    * [install experiment](advanced/pushkin-cli.md#install-experiment)
    * [updateDB](advanced/pushkin-cli.md#updatedb)
    * [prep](advanced/pushkin-cli.md#prep)
    * [start](advanced/pushkin-cli.md#start)
    * [stop](advanced/pushkin-cli.md#stop)
    * [kill](advanced/pushkin-cli.md#kill)
    * [armageddon](advanced/pushkin-cli.md#armageddon)
    * [help](advanced/pushkin-cli.md#help)
  * [Using Experiment Templates](advanced/modifying-experiment-templates/)
    * [Lexical decision template](advanced/modifying-experiment-templates/lexical-decision-template.md)
    * [Grammaticality judgment template](advanced/modifying-experiment-templates/grammaticality-judgment-template.md)
    * [Self-paced reading template](advanced/modifying-experiment-templates/self-paced-reading-template.md)
  * [Experiment Structure](advanced/experiment-structure/)
    * [Config File](advanced/experiment-structure/experiment-config-files.md)
    * [Experiment Web Page Component](advanced/experiment-structure/experiment-web-page-component.md)
    * [Recommended Structure](advanced/experiment-structure/experiment-web-page-component.md#recommended-structure)
    * [Customizing the client](advanced/experiment-structure/experiment-web-page-component.md#customizing-the-client)
    * [Worker](advanced/experiment-structure/worker-component-migration-and-seed.md#experiment-worker-component)
    * [Migrations](advanced/experiment-structure/worker-component-migration-and-seed.md#experiment-migrations)
    * [Seeds](advanced/experiment-structure/worker-component-migration-and-seed.md#experiment-seeds)
  * [Pushkin Client](advanced/pushkin-client.md)
    * [connect](advanced/pushkin-client.md#connect)
    * [loadScript](advanced/pushkin-client.md#loadscript)
    * [loadScripts](advanced/pushkin-client.md#loadscripts)
    * [prepExperimentRun](advanced/pushkin-client.md#prepexperimentrun)
    * [getAllStimuli](advanced/pushkin-client.md#getallstimuli)
    * [setSaveAfterEachStimulus](advanced/pushkin-client.md#setsaveaftereachstimulus)
    * [saveStimulusResponse](advanced/pushkin-client.md#savestimulusresponse)
    * [insertMetaResponse](advanced/pushkin-client.md#insertmetaresponse)
    * [endExperiment](advanced/pushkin-client.md#endexperiment)
    * [customApiCall](advanced/pushkin-client.md#customapicall)
  * [pushkin-api](https://pushkin-social-science-at-scale.readthedocs.io/en/latest/api/pushkin_api.html)
    * [Controller Builder](advanced/pushkin-api/api-controller-builder.md)
    * [Core API](advanced/pushkin-api/core-api.md)
  * [Users & Authentication](advanced/users-and-authentication.md)
    * [Generating UserIDs](advanced/users-and-authentication.md#generating-userids)
    * [Using UserIDs](advanced/users-and-authentication.md#using-userids)
  * [Modifying Site Template](advanced/modifying-site-template/)
    * [React Bootstrap](advanced/modifying-site-template/react-bootstrap.md)
    * [Header and Footer](advanced/modifying-site-template/header-and-footer.md)
    * [Home Page](advanced/modifying-site-template/home-page.md)
    * [Findings Page](advanced/modifying-site-template/findings-page.md)
    * [About Page](advanced/modifying-site-template/about-page.md)
    * [Feedback Page](advanced/modifying-site-template/feedback-page.md)
  * [Deployment](advanced/deploying/)
    * [Deleting AWS](advanced/deploying/awsDeletion.md)

* **Developers**
  * [Developing with Pushkin](developers/developing-with-pushkin.md)
  * [Getting Started on Development](developers/getting-started-on-development.md)
    * [Understanding the Front End](developers/getting-started-on-development.md#understanding-the-front-end)
    * [Understanding Docker](developers/getting-started-on-development.md#understanding-docker)
    * [Testing Pushkin Modules Locally](developers/getting-started-on-development.md#testing-pushkin-modules-locally)
    * [Pushkin jsPsych](https://github.com/pushkin-consortium/pushkin/tree/423120801ce745e971a197dd80d762db002b1749/docs-gitbook/developers/getting-started-on-development/README.md#pushkin-jspsych)
  * [Testing Pushkin with Jest](advanced/testing-pushkin-with-jest.md)

