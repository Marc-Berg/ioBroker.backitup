import type { BackItUpAdapterOptions } from './types';

/**
 * Check the storage size on the instance's host
 *
 * @param options Adapter options
 * @param adapterName Adapter name
 * @param log log object
 */
export async function storageSizeCheck(
    options: {
        config: BackItUpAdapterOptions;
        instance: number;
        getForeignObjectAsync: (id: string) => Promise<ioBroker.InstanceObject | null | undefined>;
        getForeignStateAsync: (id: string) => Promise<ioBroker.State | null | undefined>;
    },
    adapterName: string,
    log: ioBroker.Log,
): Promise<{
    diskState: 'ok' | 'warn' | 'error';
    diskFree: number;
    storage: 'nas' | 'local';
    ready: boolean;
} | null> {
    const storageSizeErr = options.config.fileSizeError || 512;
    const storageSizeWarn = options.config.fileSizeWarning || 1024;

    const adapterConf: ioBroker.InstanceObject | null | undefined = await options
        .getForeignObjectAsync(`system.adapter.${adapterName}.${options.instance}`)
        .catch(err => log.error(err));

    if (adapterConf?.common?.host) {
        const _diskFree: ioBroker.State | null | undefined = await options
            .getForeignStateAsync(`system.host.${adapterConf.common.host}.diskFree`)
            .catch(err => log.error(err));

        if (_diskFree?.val) {
            const sysCheck: {
                diskState: 'ok' | 'warn' | 'error';
                diskFree: number;
                storage: 'nas' | 'local';
                ready: boolean;
            } = {
                diskState: _diskFree.val as number > storageSizeWarn ? 'ok' : _diskFree.val as number > storageSizeErr ? 'warn' : 'error',
                diskFree: _diskFree.val as number,
                storage: options.config.cifsEnabled ? 'nas' : 'local',
                ready: !!(options.config.cifsEnabled || (_diskFree.val as number) > storageSizeErr),
            };

            switch (sysCheck.diskState) {
                case 'warn':
                    log.warn(
                        `On the host "${adapterConf.common.host}" only ${_diskFree.val} MB free space is available! Please check your system!`,
                    );
                    break;
                case 'error':
                    log.error(
                        `On the host "${adapterConf.common.host}" only ${_diskFree.val} MB free space is available! Local backups are currently not possible. Please check your system!`,
                    );
                    break;
            }

            return sysCheck;
        }
    }
    return null;
}

/**
 * Send notification message
 * @param options
 * @param sysMessage
 */
export function systemMessage(
    options: {
        config: BackItUpAdapterOptions;
        instance: number;
        log: ioBroker.Log;
        sendTo: (
            instance: string,
            command: 'send' | 'sendMessage',
            params: {
                user?: string;
                to?: string;
                subject?: string;
                from?: string;
                text?: string;
                disable_notification?: boolean;
                message?: string;
                sound?: string;
                priority?: number;
                title?: string;
                device?: string;
                userId?: string;
                content?: string;
                serverId?: string;
                channelId?: string;
            },
        ) => void;
    },
    sysMessage: string,
): void {
    if (options.config.notificationEnabled) {
        switch (options.config.notificationsType) {
            case 'Telegram':
                if (
                    options.config.telegramUser &&
                    options.config.telegramUser === 'allTelegramUsers' &&
                    options.config.telegramInstance
                ) {
                    try {
                        options.sendTo(options.config.telegramInstance, 'send', {
                            text: `BackItUp:\n${sysMessage}`,
                            disable_notification: options.config.telegramSilentNotice,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Telegram message: ${err}`);
                    }
                } else if (options.config.telegramInstance) {
                    try {
                        options.sendTo(options.config.telegramInstance, 'send', {
                            user: options.config.telegramUser,
                            text: `BackItUp:\n${sysMessage}`,
                            disable_notification: options.config.telegramSilentNotice,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Telegram message: ${err}`);
                    }
                }
                break;
            case 'E-Mail':
                if (options.config.emailInstance && options.config.emailReceiver && options.config.emailSender) {
                    try {
                        options.sendTo(options.config.emailInstance, 'send', {
                            text: `BackItUp:\n${sysMessage}`,
                            to: options.config.emailReceiver,
                            subject: 'Backitup',
                            from: options.config.emailSender,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending E-Mail message: ${err}`);
                    }
                }
                break;
            case 'Pushover':
                if (
                    ((options.config.pushoverSilentNotice as unknown as string) === 'true' ||
                        options.config.pushoverSilentNotice === true) &&
                    options.config.pushoverInstance &&
                    options.config.pushoverDeviceID
                ) {
                    try {
                        options.sendTo(options.config.pushoverInstance, 'send', {
                            message: `BackItUp:\n${sysMessage}`,
                            sound: '',
                            priority: -1,
                            title: 'Backitup',
                            device: options.config.pushoverDeviceID,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Pushover message: ${err}`);
                    }
                } else if (options.config.pushoverInstance && options.config.pushoverDeviceID) {
                    try {
                        options.sendTo(options.config.pushoverInstance, 'send', {
                            message: `BackItUp:\n${sysMessage}`,
                            sound: '',
                            title: 'Backitup',
                            device: options.config.pushoverDeviceID,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Pushover message: ${err}`);
                    }
                }
                break;
            case 'WhatsApp':
                if (options.config.whatsappInstance) {
                    try {
                        options.sendTo(options.config.whatsappInstance, 'send', {
                            text: `BackItUp:\n${sysMessage}`,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending WhatsApp message: ${err}`);
                    }
                }
                break;
            case 'Signal':
                if (options.config.signalInstance) {
                    try {
                        options.sendTo(options.config.signalInstance, 'send', {
                            text: `BackItUp:\n${sysMessage}`,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Signal message: ${err}`);
                    }
                }
                break;
            case 'Matrix':
                if (options.config.matrixInstance) {
                    try {
                        options.sendTo(options.config.matrixInstance, 'send', {
                            text: `BackItUp:\n${sysMessage}`,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Matrix message: ${err}`);
                    }
                }
                break;
            case 'Discord':
                if (options.config.discordInstance && options.config.discordTarget) {
                    if (options.config.discordTarget.match(/^\d+$/)) {
                        // send to a single user
                        try {
                            options.sendTo(options.config.discordInstance, 'sendMessage', {
                                userId: options.config.discordTarget,
                                content: `BackItUp:\n${sysMessage}`,
                            });
                        } catch (err) {
                            options.log.warn(`Error sending Discord message: ${err}`);
                        }
                    } else if (options.config.discordTarget.match(/^\d+\/\d+$/)) {
                        // send to a server channel
                        const [serverId, channelId] = options.config.discordTarget.split('/');
                        try {
                            options.sendTo(options.config.discordInstance, 'sendMessage', {
                                serverId,
                                channelId,
                                content: `BackItUp:\n${sysMessage}`,
                            });
                        } catch (err) {
                            options.log.warn(`Error sending Discord message: ${err}`);
                        }
                    }
                }
                break;
        }
    }
}