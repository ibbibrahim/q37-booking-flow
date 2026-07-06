import { useMemo, useState } from 'react';
import { Plus, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ListPaginationBar,
  getInitialPage,
  getInitialPageSize,
} from '@/components/ui/list-pagination-bar';
import { departments, departmentName } from '../data/departments';
import { employees as employeesSeed } from '../data/employeesSeed';
import { EmployeeDetailSheet } from '../components/EmployeeDetailSheet';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { contractTypeBadgeClass, formatDate, statusBadgeClass } from '../utils/hrUtils';
import type { Employee } from '../types/hr';

const STORAGE_KEY = 'hr-employee-records';

export function EmployeeRecordsPage() {
  const [employees, setEmployees] = useState<Employee[]>(employeesSeed);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contractFilter, setContractFilter] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(() => getInitialPage(STORAGE_KEY, 1));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(STORAGE_KEY, 10));

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (term) {
        const matches =
          e.fullName.toLowerCase().includes(term) ||
          e.qid.toLowerCase().includes(term) ||
          e.jobTitle.toLowerCase().includes(term) ||
          e.jobNumber.toLowerCase().includes(term);
        if (!matches) return false;
      }
      if (departmentFilter !== 'all' && e.departmentId !== Number(departmentFilter)) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (contractFilter !== 'all' && e.contractType !== contractFilter) return false;
      return true;
    });
  }, [employees, search, departmentFilter, statusFilter, contractFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openDetail = (emp: Employee) => {
    setSelectedEmployee(emp);
    setDetailOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setDetailOpen(false);
    setEditingEmployee(emp);
    setFormOpen(true);
  };

  const openAdd = () => {
    setEditingEmployee(null);
    setFormOpen(true);
  };

  const handleSave = (emp: Employee) => {
    setEmployees((prev) => {
      const exists = prev.some((e) => e.id === emp.id);
      return exists ? prev.map((e) => (e.id === emp.id ? emp : e)) : [emp, ...prev];
    });
  };

  const nextId = Math.max(0, ...employees.map((e) => e.id)) + 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Records</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} of {employees.length} employees
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-1" /> Add Employee
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, QID, or job title..."
              className="pl-9"
            />
          </div>
          <Select
            value={departmentFilter}
            onValueChange={(v) => {
              setDepartmentFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="lg:w-56">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={contractFilter}
            onValueChange={(v) => {
              setContractFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="lg:w-44">
              <SelectValue placeholder="Contract Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contracts</SelectItem>
              <SelectItem value="Permanent">Permanent</SelectItem>
              <SelectItem value="Freelance">Freelance</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="lg:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
              <SelectItem value="End of Service">End of Service</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <ListPaginationBar
        currentPage={safePage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        storageKey={STORAGE_KEY}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job Number</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>QID</TableHead>
                <TableHead>Nationality</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((emp) => (
                <TableRow
                  key={emp.id}
                  className={
                    emp.recentlyConvertedToPermanent
                      ? 'bg-yellow-400/10 hover:bg-yellow-400/15'
                      : undefined
                  }
                >
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{emp.fullName}</span>
                      <div className="flex flex-wrap gap-1">
                        {emp.onLeave && (
                          <Badge className="border-transparent bg-warning/15 text-warning text-[10px]">
                            On Leave
                          </Badge>
                        )}
                        {emp.recentlyConvertedToPermanent && (
                          <Badge className="border-transparent bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 text-[10px]">
                            Freelance → Permanent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{emp.jobNumber}</TableCell>
                  <TableCell>{emp.jobTitle}</TableCell>
                  <TableCell>{departmentName(emp.departmentId)}</TableCell>
                  <TableCell>{formatDate(emp.joinDate)}</TableCell>
                  <TableCell>
                    <Badge className={contractTypeBadgeClass(emp.contractType)}>{emp.contractType}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{emp.qid}</TableCell>
                  <TableCell>{emp.nationality}</TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(emp.status)}>{emp.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(emp)}>
                      <Eye size={14} className="mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pageItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                    No employees match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EmployeeDetailSheet
        employee={selectedEmployee}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
      />
      <EmployeeFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editingEmployee}
        nextId={nextId}
        onSave={handleSave}
      />
    </div>
  );
}
