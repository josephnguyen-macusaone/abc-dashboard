# Frontend Integration Plan

This document outlines the comprehensive plan to integrate the backend user management system and role-based access control into the ABC Dashboard frontend.

## 🎯 Integration Overview

### Backend Features to Integrate

- ✅ **User Management System**: Role-based user creation, viewing, and management
- ✅ **Role-Based Permissions**: Admin/Manager/Staff access controls
- ✅ **Authentication Enhancements**: Login flow with forced password changes
- ✅ **Email Integration**: User notifications and password delivery

### Frontend Requirements

- 🔄 **Role-Based UI**: Different interfaces for Admin/Manager/Staff
- 🔄 **User Management Interface**: CRUD operations for users
- 🔄 **Password Reset UI**: Forgot password and forced change flows
- 🔄 **Enhanced Authentication**: Login with email verification and redirects
- 🔄 **API Integration**: Complete backend API consumption
- 🔄 **State Management**: User roles, permissions, and session handling

---

## 📋 Phase 1: Foundation & Authentication

### 1.1 Enhanced Authentication Flow

#### **Login Page Updates** (`src/app/(auth)/login/page.tsx`)

```typescript
// Current: Basic login
// New: Handle role-based navigation

const LoginPage = () => {
  const router = useRouter();
  const { user } = useAuthStore();

  // Handle forced password change redirect
  useEffect(() => {
    if (user?.requiresPasswordChange) {
      router.push('/profile/change-password?forced=true');
    }
  }, [user]);

  // Role-based post-login navigation
  const handleLoginSuccess = () => {
    const { user } = useAuthStore.getState();
    switch (user?.role) {
      case 'admin':
        router.push('/admin/users');
        break;
      case 'manager':
        router.push('/dashboard');
        break;
      default:
        router.push('/dashboard');
    }
  };
};
```

#### **Login Form Enhancements** (`src/presentation/components/organisms/form/login-form.tsx`)

- 🔄 Loading states for authentication
- 🔄 Remember me functionality
- 🔄 Social login preparation (future)

### 1.2 Enhanced Change Password Flow

#### **Change Password Page Updates** (`src/app/profile/change-password/page.tsx`)

```typescript
// Current: Basic password change
// New: Handle forced password changes with different UI

const ChangePasswordPage = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isForced = searchParams.get('forced') === 'true';

  // Detect forced change scenario
  const requiresCurrentPassword = !isForced && !user?.requiresPasswordChange;

  const handleSuccess = () => {
    if (isForced) {
      // Clear forced change flag and redirect to dashboard
      router.push('/dashboard');
      toast.success('Welcome! Your account is now active.');
    } else {
      router.push('/profile');
      toast.success('Password changed successfully!');
    }
  };

  return (
    <ChangePasswordForm
      requiresCurrentPassword={requiresCurrentPassword}
      isForcedChange={isForced}
      onSuccess={handleSuccess}
    />
  );
};
```

#### **Change Password Form Updates** (`src/presentation/components/organisms/form/change-password-form.tsx`)

- ✅ Conditional current password field
- 🔄 Different messaging for forced vs voluntary changes
- 🔄 Enhanced validation and error handling

---

## 📋 Phase 2: User Management Interface

### 2.1 Admin Dashboard

#### **User Management Page** (`src/app/admin/users/page.tsx`)

```typescript
// Admin-only page for comprehensive user management
const AdminUserManagement = () => {
  const { users, loading, error } = useUsers();
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: ''
  });

  return (
    <div className="space-y-6">
      {/* Header with Create User button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={() => router.push('/admin/users/create')}>
          <UserPlus className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Filters */}
      <UserFilters filters={filters} onChange={setFilters} />

      {/* User Table */}
      <UserTable
        users={filteredUsers}
        onEdit={(user) => router.push(`/admin/users/${user.id}/edit`)}
        onDelete={handleDeleteUser}
        onReassign={(user) => router.push(`/admin/users/${user.id}/reassign`)}
      />

      {/* Bulk Actions */}
      <BulkActions selectedUsers={selectedUsers} />
    </div>
  );
};
```

#### **Create User Form** (`src/app/admin/users/create/page.tsx`)

```typescript
// Role-based user creation form
const CreateUserPage = () => {
  const { user: currentUser } = useAuthStore();
  const router = useRouter();

  // Get available roles based on current user
  const availableRoles = getAvailableRoles(currentUser.role);

  const handleSubmit = async (formData) => {
    try {
      // API call with proper permissions
      const result = await userApi.createUser({
        ...formData,
        createdBy: currentUser.id
      });

      toast.success('User created successfully!');
      router.push('/admin/users');
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  return (
    <CreateUserForm
      availableRoles={availableRoles}
      currentUserRole={currentUser.role}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
};
```

### 2.2 Manager Dashboard

#### **Team Management Page** (`src/app/manager/team/page.tsx`)

```typescript
// Manager view of their assigned staff
const ManagerTeamPage = () => {
  const { user: currentUser } = useAuthStore();
  const { users: teamMembers } = useUsers({
    managedBy: currentUser.id
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Team</h1>
        <Button onClick={() => router.push('/manager/team/create')}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      <TeamTable
        teamMembers={teamMembers}
        onView={(user) => router.push(`/manager/team/${user.id}`)}
        onEdit={(user) => router.push(`/manager/team/${user.id}/edit`)}
      />
    </div>
  );
};
```

### 2.3 Shared Components

#### **User Table Component** (`src/presentation/components/organisms/user-table.tsx`)

```typescript
interface UserTableProps {
  users: User[];
  showRoleColumn?: boolean;
  showManagerColumn?: boolean;
  actions?: UserAction[];
  onAction: (action: string, user: User) => void;
}

const UserTable = ({
  users,
  showRoleColumn = true,
  showManagerColumn = false,
  actions = ['view', 'edit', 'delete'],
  onAction
}) => {
  return (
    <DataTable
      data={users}
      columns={[
        { key: 'displayName', label: 'Name' },
        { key: 'email', label: 'Email' },
        showRoleColumn && { key: 'role', label: 'Role' },
        showManagerColumn && { key: 'managedBy', label: 'Manager' },
        {
          key: 'actions',
          label: 'Actions',
          render: (user) => (
            <UserActionsMenu
              user={user}
              availableActions={actions}
              onAction={(action) => onAction(action, user)}
            />
          )
        }
      ]}
    />
  );
};
```

#### **User Form Component** (`src/presentation/components/organisms/user-form.tsx`)

```typescript
interface UserFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<User>;
  availableRoles: string[];
  currentUserRole: string;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
}

const UserForm = ({
  mode,
  initialData,
  availableRoles,
  currentUserRole,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    username: initialData?.username || '',
    email: initialData?.email || '',
    displayName: initialData?.displayName || '',
    role: initialData?.role || 'staff',
    phone: initialData?.phone || '',
    managerId: initialData?.managedBy || '',
  });

  // Dynamic form fields based on role and permissions
  const showManagerField = currentUserRole === 'admin' && formData.role === 'staff';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormField label="Username" required>
        <Input
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          disabled={mode === 'edit'}
        />
      </FormField>

      <FormField label="Email" required>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
      </FormField>

      <FormField label="Display Name" required>
        <Input
          value={formData.displayName}
          onChange={(e) => setFormData({...formData, displayName: e.target.value})}
        />
      </FormField>

      <FormField label="Role" required>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData({...formData, role: value})}
        >
          {availableRoles.map(role => (
            <SelectItem key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </SelectItem>
          ))}
        </Select>
      </FormField>

      {showManagerField && (
        <FormField label="Manager">
          <ManagerSelect
            value={formData.managerId}
            onChange={(managerId) => setFormData({...formData, managerId})}
          />
        </FormField>
      )}

      <FormField label="Phone">
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
        />
      </FormField>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
```

---

## 📋 Phase 3: API Integration & State Management

### 3.1 API Service Updates

#### **User API Service** (`src/application/services/user-service.ts`)

```typescript
// New service for user management operations
class UserService {
  async getUsers(params: UserQueryParams): Promise<UserListResponse> {
    const response = await apiClient.get('/users', { params });
    return response.data;
  }

  async getUser(id: string): Promise<User> {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  }

  async createUser(userData: CreateUserRequest): Promise<UserResponse> {
    const response = await apiClient.post('/users', userData);
    return response.data;
  }

  async updateUser(id: string, userData: UpdateUserRequest): Promise<UserResponse> {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  }

  async reassignStaff(staffId: string, managerId: string): Promise<UserResponse> {
    const response = await apiClient.patch(`/users/${staffId}/reassign`, {
      newManagerId: managerId
    });
    return response.data;
  }
}

export const userService = new UserService();
```

#### **Auth API Updates** (`src/application/services/auth-service.ts`)

```typescript
class AuthService {
  // ... existing methods
}
```

### 3.2 State Management Updates

#### **User Store** (`src/infrastructure/stores/user-store.ts`)

```typescript
// New store for user management state
interface UserState {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  filters: UserFilters;
  pagination: PaginationState;

  // Actions
  fetchUsers: (params?: UserQueryParams) => Promise<void>;
  createUser: (userData: CreateUserRequest) => Promise<User>;
  updateUser: (id: string, userData: UpdateUserRequest) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  reassignStaff: (staffId: string, managerId: string) => Promise<User>;
  setFilters: (filters: UserFilters) => void;
  setPagination: (pagination: PaginationState) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  currentUser: null,
  loading: false,
  error: null,
  filters: {},
  pagination: { page: 1, limit: 10, total: 0 },

  fetchUsers: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await userService.getUsers({
        ...get().filters,
        ...get().pagination,
        ...params,
      });
      set({
        users: response.users,
        pagination: response.pagination,
        loading: false
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  createUser: async (userData) => {
    set({ loading: true, error: null });
    try {
      const newUser = await userService.createUser(userData);
      set(state => ({
        users: [...state.users, newUser.user],
        loading: false
      }));
      return newUser.user;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // ... other actions
}));
```

#### **Auth Store Enhancements** (`src/infrastructure/stores/auth-store.ts`)

```typescript
// Enhanced auth state management
interface AuthState {
  // ... existing state

  // ... existing actions
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // ... existing state

  // ... existing actions
}));
```

---

## 📋 Phase 4: UI/UX Enhancements

### 4.1 Role-Based Navigation

#### **Navigation Component Updates** (`src/presentation/components/molecules/sidebar/navigation.tsx`)

```typescript
// Dynamic navigation based on user role
const Navigation = () => {
  const { user } = useAuthStore();

  const navigationItems = useMemo(() => {
    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
    ];

    if (user?.role === 'admin') {
      return [
        ...baseItems,
        { name: 'User Management', href: '/admin/users', icon: Users },
        { name: 'System Settings', href: '/admin/settings', icon: Settings },
      ];
    }

    if (user?.role === 'manager') {
      return [
        ...baseItems,
        { name: 'My Team', href: '/manager/team', icon: Users },
        { name: 'Reports', href: '/manager/reports', icon: BarChart },
      ];
    }

    // Staff navigation
    return [
      ...baseItems,
      { name: 'My Profile', href: '/profile', icon: User },
    ];
  }, [user?.role]);

  return (
    <nav className="space-y-2">
      {navigationItems.map((item) => (
        <NavLink key={item.name} href={item.href} icon={item.icon}>
          {item.name}
        </NavLink>
      ))}
    </nav>
  );
};
```

### 4.2 Permission-Based Components

#### **Permission Guard HOC** (`src/presentation/components/routes/permission-guard.tsx`)

```typescript
interface PermissionGuardProps {
  children: React.ReactNode;
  requiredRole?: string[];
  requiredPermission?: string[];
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredRole = [],
  requiredPermission = [],
  fallback = <AccessDenied />
}) => {
  const { user } = useAuthStore();

  // Check role permissions
  const hasRequiredRole = !requiredRole.length ||
    requiredRole.includes(user?.role || '');

  // Check specific permissions (future enhancement)
  const hasRequiredPermission = !requiredPermission.length ||
    requiredPermission.every(permission => user?.permissions?.includes(permission));

  if (!user || !hasRequiredRole || !hasRequiredPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Usage examples
<PermissionGuard requiredRole={['admin']}>
  <AdminPanel />
</PermissionGuard>

<PermissionGuard requiredRole={['admin', 'manager']}>
  <UserManagement />
</PermissionGuard>
```

#### **Conditional UI Elements**

```typescript
// Show admin-only features
{user?.role === 'admin' && (
  <Button onClick={handleAdminAction}>
    Admin Action
  </Button>
)}

// Manager or admin features
{(user?.role === 'admin' || user?.role === 'manager') && (
  <UserManagementSection />
)}
```

### 4.3 Loading & Error States

#### **Enhanced Loading Components**

```typescript
// User table loading state
const UserTableSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);

// API error boundary
const ApiErrorFallback = ({ error, resetError }) => (
  <div className="text-center p-8">
    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
    <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
    <p className="text-gray-600 mb-4">{error.message}</p>
    <Button onClick={resetError}>Try Again</Button>
  </div>
);
```

---

## 📋 Phase 5: Testing & Deployment

### 5.1 Component Testing

#### **User Management Tests**

```typescript
describe('UserManagement', () => {
  it('should show create user button for admin', () => {
    render(<UserManagement />, { user: { role: 'admin' } });
    expect(screen.getByText('Create User')).toBeInTheDocument();
  });

  it('should hide create user button for staff', () => {
    render(<UserManagement />, { user: { role: 'staff' } });
    expect(screen.queryByText('Create User')).not.toBeInTheDocument();
  });

  it('should filter users by manager for manager role', async () => {
    const mockUsers = [{ id: 1, managedBy: 'manager-1' }];
    mockUserService.getUsers.mockResolvedValue({
      users: mockUsers,
      pagination: { total: 1, page: 1, limit: 10 }
    });

    render(<UserManagement />, { user: { role: 'manager', id: 'manager-1' } });

    await waitFor(() => {
      expect(mockUserService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({ managedBy: 'manager-1' })
      );
    });
  });
});
```

### 5.2 Integration Testing

#### **User Creation Flow**

```typescript
describe('User Creation Flow', () => {
  it('should create user and send email', async () => {
    // Mock API calls
    mockUserService.createUser.mockResolvedValue({
      user: mockUser,
      message: 'User created successfully'
    });

    // Fill form
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    });

    // Submit form
    fireEvent.click(screen.getByText('Create User'));

    // Verify API call
    await waitFor(() => {
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        // ... other fields
      });
    });

    // Verify success message
    expect(screen.getByText('User created successfully')).toBeInTheDocument();
  });
});
```

### 5.3 E2E Testing

#### **Authentication Flow**

```typescript
describe('Authentication Flow', () => {
});
```

---

## 📋 Phase 6: Performance & Optimization

### 6.1 Data Fetching Optimization

#### **React Query Integration**

```typescript
// User management queries
export const useUsers = (params = {}) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userService.getUsers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUser = (id) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getUser(id),
    enabled: !!id,
  });
};

// Mutations with optimistic updates
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.createUser,
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create user');
    },
  });
};
```

### 6.2 Component Optimization

#### **Memoization & Virtualization**

```typescript
// Memoized user table row
const UserTableRow = memo(({ user, onAction }) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2">{user.displayName}</td>
      <td className="px-4 py-2">{user.email}</td>
      <td className="px-4 py-2">
        <UserActions user={user} onAction={onAction} />
      </td>
    </tr>
  );
});

// Virtualized list for large user lists
const VirtualizedUserTable = ({ users }) => {
  return (
    <FixedSizeList
      height={400}
      itemCount={users.length}
      itemSize={50}
    >
      {({ index, style }) => (
        <div style={style}>
          <UserTableRow user={users[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

---

## 🎯 Implementation Roadmap

### **Week 1-2: Foundation**

- [ ] Enhanced authentication flow
- [ ] Password reset UI implementation
- [ ] Basic user management components
- [ ] API integration setup

### **Week 3-4: Core Features**

- [ ] Admin user management dashboard
- [ ] Manager team management
- [ ] Role-based navigation
- [ ] Form validation and error handling

### **Week 5-6: Advanced Features**

- [ ] Bulk operations
- [ ] Advanced filtering and search
- [ ] User reassignment workflow
- [ ] Performance optimizations

### **Week 7-8: Testing & Polish**

- [ ] Component testing
- [ ] Integration testing
- [ ] E2E testing
- [ ] UI/UX refinements

### **Week 9-10: Deployment**

- [ ] Production build optimization
- [ ] Performance monitoring
- [ ] Documentation updates
- [ ] User training materials

---

## 📊 Success Metrics

- **User Management**: Complete CRUD operations for all user types
- **Role-Based Access**: Proper permission enforcement throughout UI
- **Password Security**: Seamless reset and forced change flows
- **Performance**: <2s load times for user lists and operations
- **Accessibility**: WCAG 2.1 AA compliance
- **Testing Coverage**: >90% component and integration test coverage
- **User Satisfaction**: Intuitive workflows with minimal training required

This comprehensive plan ensures a production-ready frontend that fully leverages all backend capabilities while providing an excellent user experience across all role types. 🚀✨
