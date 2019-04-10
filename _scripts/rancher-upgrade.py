# from https://github.com/cr0hn/rancher-upgrader

import json
import time
import argparse
import requests

from typing import Union, Tuple


class RancherUpgradeException(Exception):
    pass


class RancherUpgradeFailException(Exception):
    pass


class RancherUpgradeOptions:

    def __init__(self,
                 stack_name: str,
                 service_name: str,
                 rancher_url: str,
                 rancher_access_key: str,
                 rancher_secret_key: str,
                 *,
                 retries: int = 25,
                 sleep_time: int = 5):

        self.sleep_time = sleep_time
        self.retries = retries
        self.stack_name = stack_name
        self.rancher_url = rancher_url
        self.service_name = service_name
        self.rancher_secret_key = rancher_secret_key
        self.rancher_access_key = rancher_access_key


def do_rollback(config: RancherUpgradeOptions,
                service_id: str):
    requests.post(
        "{rancher_host}/v2-beta/services/{service_id}?action=rollback".format(
            rancher_host=config.rancher_url,
            service_id=service_id
        ),
        verify=False,
        auth=(config.rancher_access_key, config.rancher_secret_key))


def do_request_upgrade(config: RancherUpgradeOptions,
                       service_id: str,
                       payload: dict):

    # Upgrade the service with payload
    requests.post(
        "{rancher_host}/v2-beta/services/{service_id}/?action=upgrade".format(
            rancher_host=config.rancher_url,
            service_id=service_id
        ),
        data=json.dumps(payload),
        headers={'content-type': 'application/json'},
        verify=False,
        auth=(config.rancher_access_key, config.rancher_secret_key))


def do_finish_request_upgrade(config: RancherUpgradeOptions,
                              service_id: str):

    # Upgrade the service with payload
    requests.post(
        '{rancher_host}/v2-beta/services/{service_id}?action='
        'finishupgrade'.format(
            rancher_host=config.rancher_url,
            service_id=service_id
        ),
        verify=False,
        auth=(config.rancher_access_key, config.rancher_secret_key))


def get_stack_id(config: RancherUpgradeOptions) -> \
        Union[str, RancherUpgradeException]:

    r = requests.get(
        "{rancher_host}/v2-beta/stacks?name={stack_name}".format(
            rancher_host=config.rancher_url,
            stack_name=config.stack_name),
        verify=False,
        auth=(config.rancher_access_key, config.rancher_secret_key))

    if r.status_code == 401:
        raise RancherUpgradeException("Unauthorized. Please check your "
                                      "ACCESS_KEY / SECRET_KEY ")

    try:
        return r.json()['data'][0]["id"]
    except (KeyError, IndexError):
        raise RancherUpgradeException("Stack ID not found")


def get_service_info(config: RancherUpgradeOptions,
                     stack_id: str) -> \
        Union[Tuple[str, dict],
              RancherUpgradeException]:

    def _build_upgrade_response(config: RancherUpgradeOptions,
                                launch_config: dict) -> dict:

        # Construct payload for upgrade
        payload = {
            'inServiceStrategy': {
                'batchSize': 1,
                'intervalMillis': 2000,
                'startFirst': False,
                'launchConfig': launch_config
            }
        }

        return payload

    r = requests.get(
        '{rancher_host}/v2-beta/services?name={service_name}&stackId='
        '{stack_id}'.format(
            rancher_host=config.rancher_url,
            service_name=config.service_name,
            stack_id=stack_id),
        verify=False,
        auth=(config.rancher_access_key, config.rancher_secret_key))

    try:
        json_data = r.json()["data"][0]

        service_id = json_data["id"]
        launch_config = json_data["launchConfig"]

        return service_id, _build_upgrade_response(config, launch_config)

    except (KeyError, IndexError):
        raise RancherUpgradeException("Stack ID not found")


def check_upgrading_status(config: RancherUpgradeOptions,
                           service_id: str) -> \
        Union[str, RancherUpgradeFailException]:

    r = requests.get(
        "{rancher_host}/v2-beta/services/{service_id}".format(
            rancher_host=config.rancher_url,
            service_id=service_id
        ),
        verify=False,
        auth=(config.rancher_access_key, config.rancher_secret_key))

    json_data = r.json()

    # Check errors
    if json_data["transitioning"] == "error":

        raise RancherUpgradeFailException(json_data["transitioningMessage"])
    return json_data['state']


def make_upgrade(config: RancherUpgradeOptions,
                 service_id: str,
                 payload: dict):

    do_request_upgrade(config, service_id, payload)

    for _ in range(config.retries):
        print("    < * > Upgrading: {stack_name}/{service_name}".format(
            stack_name=config.stack_name,
            service_name=config.service_name
        ))

        # Wait for upgrade
        time.sleep(config.sleep_time)

        try:
            # Check Status
            status = check_upgrading_status(config, service_id)

            if status == "upgraded":
                do_finish_request_upgrade(config, service_id)

                print("[*] Upgrade completed")
                break

        except RancherUpgradeFailException as e:
            print("    < ! >", e)

            # Doing rollback
            print("    < * > Doing rollback")
            do_rollback(config, service_id)

            break

    else:
        raise RancherUpgradeException("Maximum retires reached. Exiting...")


def do_tasks(config: RancherUpgradeOptions):
    # Find stack based on their name
    stack_id = get_stack_id(config)
    service_id, payload = get_service_info(config, stack_id)

    do_request_upgrade(config, service_id, payload)

    make_upgrade(config, service_id, payload)


def main():
    parser = argparse.ArgumentParser(
        description='Rancher service upgrader')

    # Main options
    parser.add_argument('-n', dest="STACK_NAME",
                        help="stack name.",
                        required=True)
    parser.add_argument('-s', dest="SERVICE_NAME",
                        help="service name",
                        required=True)
    parser.add_argument('-u', dest="RANCHER_URL",
                        help="rancher portal url",
                        required=True)
    parser.add_argument('-a', dest="RANCHER_ACCESS_KEY",
                        help="rancher secret key",
                        required=True)
    parser.add_argument('-k', dest="RANCHER_SECRET_KEY",
                        help="rancher access key",
                        required=True)

    # Other options
    extra_opt = parser.add_argument_group("Extra options")
    extra_opt.add_argument('--retires',
                           dest="MAX_RETRIES",
                           help="maximum number of retries to check upgrade process",
                           default=25)
    extra_opt.add_argument('--sleep',
                           dest="SLEEP_TIME",
                           help="sleep time while checking upgrading process",
                           action="store_true",
                           default=5)

    parsed = parser.parse_args()

    # Build config
    config = RancherUpgradeOptions(
        stack_name=parsed.STACK_NAME,
        service_name=parsed.SERVICE_NAME,
        rancher_url=parsed.RANCHER_URL,
        rancher_access_key=parsed.RANCHER_ACCESS_KEY,
        rancher_secret_key=parsed.RANCHER_SECRET_KEY,
        retries=parsed.MAX_RETRIES,
        sleep_time=parsed.SLEEP_TIME
    )

    try:
        print("[*] Starting the upgrade")

        do_tasks(config)

    except Exception as e:
        print("[!] ", e)
        exit(1)


if __name__ == '__main__':
    main()