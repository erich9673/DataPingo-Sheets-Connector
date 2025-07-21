import React from 'react';
interface SlackConnectorProps {
    isConnected: boolean;
    webhookUrl: string;
    onConnect: (webhookUrl: string) => void;
}
declare const SlackConnector: React.FC<SlackConnectorProps>;
export default SlackConnector;
