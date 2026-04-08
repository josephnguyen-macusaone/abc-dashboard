'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/atoms/forms/select';
import { Typography } from '@/presentation/components/atoms';
import {
  MANAGER_ROLES,
  ROLE_DEFINITIONS,
  USER_ROLES,
  type UserRoleType,
} from '@/shared/constants';

/**
 * Create-user (admin): first dropdown section — admin + managers.
 * `MANAGER_ROLES` is the single source of truth for the manager role key.
 */
export const CREATE_USER_ROLE_SECTION_ADMIN_AND_MANAGERS: UserRoleType[] = [
  USER_ROLES.ADMIN,
  ...MANAGER_ROLES,
];

/** Create-user (admin): second section — staff roles. */
export const CREATE_USER_ROLE_SECTION_STAFF: UserRoleType[] = [
  USER_ROLES.ACCOUNTANT,
  USER_ROLES.TECH,
  USER_ROLES.AGENT,
];

/** Edit-user: stable order for full role list (descriptions from ROLE_DEFINITIONS). */
export const EDIT_USER_ROLE_SELECT_ORDER: UserRoleType[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.ACCOUNTANT,
  ...MANAGER_ROLES,
  USER_ROLES.TECH,
  USER_ROLES.AGENT,
];

type BaseUserRoleSelectProps = {
  value: UserRoleType | undefined;
  onValueChange: (role: UserRoleType) => void;
  disabled?: boolean;
  placeholder?: string;
  triggerClassName?: string;
};

export type UserRoleSelectCreateAdminSectionedProps = BaseUserRoleSelectProps & {
  variant: 'create-admin-sectioned';
  adminAndManagerRoles: UserRoleType[];
  staffRoles: UserRoleType[];
};

export type UserRoleSelectCreateFlatProps = BaseUserRoleSelectProps & {
  variant: 'create-flat';
  options: { value: UserRoleType; label: string }[];
};

export type UserRoleSelectEditProps = BaseUserRoleSelectProps & {
  variant: 'edit';
  roles?: UserRoleType[];
  showDescriptions?: boolean;
};

/** Edit-user: same Management / Staff grouping as create-admin-sectioned; optional per-role descriptions. */
export type UserRoleSelectEditSectionedProps = BaseUserRoleSelectProps & {
  variant: 'edit-sectioned';
  adminAndManagerRoles: UserRoleType[];
  staffRoles: UserRoleType[];
  showDescriptions?: boolean;
};

export type UserRoleSelectProps =
  | UserRoleSelectCreateAdminSectionedProps
  | UserRoleSelectCreateFlatProps
  | UserRoleSelectEditProps
  | UserRoleSelectEditSectionedProps;

export function UserRoleSelect(props: UserRoleSelectProps) {
  const {
    value,
    onValueChange,
    disabled,
    placeholder = 'Select a role',
    triggerClassName = 'h-11',
  } = props;

  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as UserRoleType)}
      disabled={disabled}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {props.variant === 'create-admin-sectioned' ? (
          <>
            {props.adminAndManagerRoles.length > 0 ? (
              <SelectGroup>
                <SelectLabel className="text-muted-foreground">Management</SelectLabel>
                {props.adminAndManagerRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_DEFINITIONS[role]?.displayName ?? role}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
            {props.adminAndManagerRoles.length > 0 && props.staffRoles.length > 0 ? (
              <SelectSeparator />
            ) : null}
            {props.staffRoles.length > 0 ? (
              <SelectGroup>
                <SelectLabel className="text-muted-foreground">
                  Staff
                </SelectLabel>
                {props.staffRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_DEFINITIONS[role]?.displayName ?? role}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
          </>
        ) : null}

        {props.variant === 'create-flat'
          ? props.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))
          : null}

        {props.variant === 'edit'
          ? (props.roles ?? EDIT_USER_ROLE_SELECT_ORDER).map((role) => {
              const def = ROLE_DEFINITIONS[role];
              const showDesc = props.showDescriptions !== false;
              return (
                <SelectItem key={role} value={role}>
                  {showDesc ? (
                    <div className="flex items-center gap-2">
                      <span>{def.displayName}</span>
                      <Typography variant="body-xs" color="muted" as="span">
                        {def.description}
                      </Typography>
                    </div>
                  ) : (
                    def.displayName
                  )}
                </SelectItem>
              );
            })
          : null}

        {props.variant === 'edit-sectioned' ? (
          <>
            {props.adminAndManagerRoles.length > 0 ? (
              <SelectGroup>
                <SelectLabel className="text-muted-foreground">Management</SelectLabel>
                {props.adminAndManagerRoles.map((role) => {
                  const def = ROLE_DEFINITIONS[role];
                  const showDesc = props.showDescriptions === true;
                  return (
                    <SelectItem key={role} value={role}>
                      {showDesc ? (
                        <div className="flex items-center gap-2">
                          <span>{def.displayName}</span>
                          <Typography variant="body-xs" color="muted" as="span">
                            {def.description}
                          </Typography>
                        </div>
                      ) : (
                        def.displayName
                      )}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ) : null}
            {props.adminAndManagerRoles.length > 0 && props.staffRoles.length > 0 ? (
              <SelectSeparator />
            ) : null}
            {props.staffRoles.length > 0 ? (
              <SelectGroup>
                <SelectLabel className="text-muted-foreground">Staff</SelectLabel>
                {props.staffRoles.map((role) => {
                  const def = ROLE_DEFINITIONS[role];
                  const showDesc = props.showDescriptions === true;
                  return (
                    <SelectItem key={role} value={role}>
                      {showDesc ? (
                        <div className="flex items-center gap-2">
                          <span>{def.displayName}</span>
                          <Typography variant="body-xs" color="muted" as="span">
                            {def.description}
                          </Typography>
                        </div>
                      ) : (
                        def.displayName
                      )}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ) : null}
          </>
        ) : null}
      </SelectContent>
    </Select>
  );
}
