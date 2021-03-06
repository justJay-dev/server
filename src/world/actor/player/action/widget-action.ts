import { Player } from '@server/world/actor/player/player';
import { pluginFilter } from '@server/plugins/plugin-loader';
import { ActionPlugin, questFilter } from '@server/plugins/plugin';

/**
 * The definition for a widget action function.
 */
export type widgetAction = (details: WidgetActionDetails) => void;

/**
 * Details about a widget action.
 */
export interface WidgetActionDetails {
    // The player performing the action.
    player: Player;
    // The ID of the UI widget that the button is on.
    widgetId: number;
    // The ID of the interacted child within the UI widget.
    childId: number;
    // The selected context menu option index.
    optionId: number;
}

/**
 * Defines a widget interaction plugin.
 */
export interface WidgetActionPlugin extends ActionPlugin {
    // A single UI widget ID or a list of widget IDs that this action applies to.
    widgetIds: number | number[];
    // A single UI widget child ID or a list of child IDs that this action applies to.
    childIds?: number | number[];
    // The context menu option index for this action.
    optionId?: number;
    // The action function to be performed.
    action: widgetAction;
    // Whether or not this item action should cancel other running or queued actions.
    cancelActions?: boolean;
}

/**
 * A directory of all button interaction plugins.
 */
let widgetInteractions: WidgetActionPlugin[] = [
];

/**
 * Sets the list of widget interaction plugins.
 * @param plugins The plugin list.
 */
export const setWidgetPlugins = (plugins: ActionPlugin[]): void => {
    widgetInteractions = plugins as WidgetActionPlugin[];
};

export const widgetAction = (player: Player, widgetId: number, childId: number, optionId: number): void => {
    // Find all item on item action plugins that match this action
    let interactionActions = widgetInteractions.filter(plugin => {
        if(!questFilter(player, plugin)) {
            return false;
        }

        if(!pluginFilter(plugin.widgetIds, widgetId)) {
            return false;
        }

        if(plugin.optionId !== undefined && plugin.optionId !== optionId) {
            return false;
        }

        if(plugin.childIds !== undefined) {
            return pluginFilter(plugin.childIds, childId);
        }

        return true;
    });
    const questActions = interactionActions.filter(plugin => plugin.questAction !== undefined);

    if(questActions.length !== 0) {
        interactionActions = questActions;
    }

    if(interactionActions.length === 0) {
        player.outgoingPackets.chatboxMessage(`Unhandled widget option: ${widgetId}, ${childId}:${optionId}`);
        return;
    }

    // Immediately run the plugins
    interactionActions.forEach(plugin => {
        if(plugin.cancelActions) {
            player.actionsCancelled.next();
        }

        plugin.action({ player, widgetId, childId, optionId });
    });
};
