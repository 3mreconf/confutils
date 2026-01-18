import React from 'react';
import { UtilityCard } from '../components/Cards/UtilityCard';
import { Server, MessageSquare, Smile, User, Trash2, Mail, Eraser, Shield, CheckCircle, Info, Webhook, HardDrive, Sparkles, Gamepad2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useModal } from '../contexts/ModalContext';
import { DiscordClonerModal } from '../components/Discord/DiscordClonerModal';
import { MessageClonerModal } from '../components/Discord/MessageClonerModal';
import { ReactionSpammerModal } from '../components/Discord/ReactionSpammerModal';
import { NicknameChangerModal } from '../components/Discord/NicknameChangerModal';
import { BulkDeleteModal } from '../components/Discord/BulkDeleteModal';
import { DmBomberModal } from '../components/Discord/DmBomberModal';
import { ChannelPurgeModal } from '../components/Discord/ChannelPurgeModal';
import { RoleClonerModal } from '../components/Discord/RoleClonerModal';
import { TokenCheckerModal } from '../components/Discord/TokenCheckerModal';
import { TokenInfoModal } from '../components/Discord/TokenInfoModal';
import { WebhookSpammerModal } from '../components/Discord/WebhookSpammerModal';
import { WebhookDeleterModal } from '../components/Discord/WebhookDeleterModal';
import { ServerBackupModal } from '../components/Discord/ServerBackupModal';
import { HypesquadChangerModal } from '../components/Discord/HypesquadChangerModal';
import { CustomRPCModal } from '../components/Discord/CustomRPCModal';
import './Discord.css';

const Discord: React.FC = () => {
  const { t } = useLanguage();
  const { openModal } = useModal();

  const handleOpenCloner = () => {
    openModal(
      'discord-cloner',
      t('discord_server_cloner_title'),
      <DiscordClonerModal modalId="discord-cloner" />,
      t('discord_server_cloner_description')
    );
  };

  const handleOpenMessageCloner = () => {
    openModal(
      'message-cloner',
      t('discord_message_cloner_title'),
      <MessageClonerModal modalId="message-cloner" />,
      t('discord_message_cloner_description')
    );
  };

  const handleOpenReactionSpammer = () => {
    openModal(
      'reaction-spammer',
      t('discord_reaction_spammer_title'),
      <ReactionSpammerModal modalId="reaction-spammer" />,
      t('discord_reaction_spammer_description')
    );
  };

  const handleOpenNicknameChanger = () => {
    openModal(
      'nickname-changer',
      t('discord_nickname_changer_title'),
      <NicknameChangerModal modalId="nickname-changer" />,
      t('discord_nickname_changer_description')
    );
  };

  const handleOpenBulkDelete = () => {
    openModal(
      'bulk-delete',
      t('discord_bulk_delete_title'),
      <BulkDeleteModal modalId="bulk-delete" />,
      t('discord_bulk_delete_description')
    );
  };

  const handleOpenDmBomber = () => {
    openModal(
      'dm-bomber',
      t('discord_dm_bomber_title'),
      <DmBomberModal modalId="dm-bomber" />,
      t('discord_dm_bomber_description')
    );
  };

  const handleOpenChannelPurge = () => {
    openModal(
      'channel-purge',
      t('discord_channel_purge_title'),
      <ChannelPurgeModal modalId="channel-purge" />,
      t('discord_channel_purge_description')
    );
  };

  const handleOpenRoleCloner = () => {
    openModal(
      'role-cloner',
      t('discord_role_cloner_title'),
      <RoleClonerModal modalId="role-cloner" />,
      t('discord_role_cloner_description')
    );
  };

  const handleOpenTokenChecker = () => {
    openModal(
      'token-checker',
      t('discord_token_checker_title'),
      <TokenCheckerModal modalId="token-checker" />,
      t('discord_token_checker_description')
    );
  };

  const handleOpenTokenInfo = () => {
    openModal(
      'token-info',
      t('discord_token_info_title'),
      <TokenInfoModal modalId="token-info" />,
      t('discord_token_info_description')
    );
  };


  const handleOpenWebhookSpammer = () => {
    openModal(
      'webhook-spammer',
      t('discord_webhook_spammer_title'),
      <WebhookSpammerModal modalId="webhook-spammer" />,
      t('discord_webhook_spammer_description')
    );
  };

  const handleOpenWebhookDeleter = () => {
    openModal(
      'webhook-deleter',
      t('discord_webhook_deleter_title'),
      <WebhookDeleterModal modalId="webhook-deleter" />,
      t('discord_webhook_deleter_description')
    );
  };


  const handleOpenServerBackup = () => {
    openModal(
      'server-backup',
      t('discord_server_backup_title'),
      <ServerBackupModal modalId="server-backup" />,
      t('discord_server_backup_description')
    );
  };

  const handleOpenHypesquadChanger = () => {
    openModal(
      'hypesquad-changer',
      t('discord_hypesquad_title'),
      <HypesquadChangerModal modalId="hypesquad-changer" />,
      t('discord_hypesquad_description')
    );
  };

  const handleOpenCustomRPC = () => {
    openModal(
      'custom-rpc',
      t('discord_custom_rpc_title') || 'Custom RPC',
      <CustomRPCModal modalId="custom-rpc" />,
      t('discord_custom_rpc_description') || 'Customize your Discord status'
    );
  };

  return (
    <div className="page-container discord-page">
      <div className="page-header">
        <h1>{t('discord_page_title')}</h1>
        <p>{t('discord_page_description')}</p>
      </div>

      <div className="grid-auto">
        
        <UtilityCard
          icon={Server}
          title={t('discord_server_cloner_title')}
          description={t('discord_server_cloner_description')}
          actionType="button"
          variant="info"
          actionLabel={t('discord_start_cloning')}
          onClick={handleOpenCloner}
        />

        <UtilityCard
          icon={HardDrive}
          title={t('discord_server_backup_title')}
          description={t('discord_server_backup_description')}
          actionType="button"
          variant="info"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenServerBackup}
        />

        
        <UtilityCard
          icon={MessageSquare}
          title={t('discord_message_cloner_title')}
          description={t('discord_message_cloner_description')}
          actionType="button"
          variant="info"
          actionLabel={t('discord_start_message_cloning')}
          onClick={handleOpenMessageCloner}
        />

        <UtilityCard
          icon={Smile}
          title={t('discord_reaction_spammer_title')}
          description={t('discord_reaction_spammer_description')}
          actionType="button"
          variant="info"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenReactionSpammer}
        />

        <UtilityCard
          icon={Trash2}
          title={t('discord_bulk_delete_title')}
          description={t('discord_bulk_delete_description')}
          actionType="button"
          variant="warning"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenBulkDelete}
        />

        <UtilityCard
          icon={Eraser}
          title={t('discord_channel_purge_title')}
          description={t('discord_channel_purge_description')}
          actionType="button"
          variant="warning"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenChannelPurge}
        />

        
        <UtilityCard
          icon={User}
          title={t('discord_nickname_changer_title')}
          description={t('discord_nickname_changer_description')}
          actionType="button"
          variant="info"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenNicknameChanger}
        />

        <UtilityCard
          icon={Mail}
          title={t('discord_dm_bomber_title')}
          description={t('discord_dm_bomber_description')}
          actionType="button"
          variant="warning"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenDmBomber}
        />

        
        <UtilityCard
          icon={Shield}
          title={t('discord_role_cloner_title')}
          description={t('discord_role_cloner_description')}
          actionType="button"
          variant="info"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenRoleCloner}
        />

        
        <UtilityCard
          icon={Sparkles}
          title={t('discord_hypesquad_title')}
          description={t('discord_hypesquad_description')}
          actionType="button"
          variant="info"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenHypesquadChanger}
        />

        <UtilityCard
          icon={Gamepad2}
          title={t('discord_custom_rpc_title') || 'Custom RPC'}
          description={t('discord_custom_rpc_description') || 'Set a custom playing status'}
          actionType="button"
          variant="info"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenCustomRPC}
        />

        
        <UtilityCard
          icon={CheckCircle}
          title={t('discord_token_checker_title')}
          description={t('discord_token_checker_description')}
          actionType="button"
          variant="info"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenTokenChecker}
        />

        <UtilityCard
          icon={Info}
          title={t('discord_token_info_title')}
          description={t('discord_token_info_description')}
          actionType="button"
          variant="info"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenTokenInfo}
        />

        
        <UtilityCard
          icon={Webhook}
          title={t('discord_webhook_spammer_title')}
          description={t('discord_webhook_spammer_description')}
          actionType="button"
          variant="warning"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenWebhookSpammer}
        />

        <UtilityCard
          icon={Trash2}
          title={t('discord_webhook_deleter_title')}
          description={t('discord_webhook_deleter_description')}
          actionType="button"
          variant="danger"
          actionLabel={t('discord_open_tool')}
          onClick={handleOpenWebhookDeleter}
        />
      </div>
    </div>
  );
};
export default Discord;
