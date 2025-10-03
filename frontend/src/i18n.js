import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      brand: 'AgentFM',
      navigation: {
        dashboard: 'Dashboard',
        properties: 'Properties',
        propertyDetail: 'Property detail',
        plans: 'Plans',
        inspections: 'Inspections',
        jobs: 'Jobs',
        serviceRequests: 'Service requests',
        recommendations: 'Recommendations',
        subscriptions: 'Subscriptions',
        reports: 'Reports',
      },
      dashboard: {
        title: 'Operations overview',
        kpiOpenJobs: 'Open jobs',
        kpiOverdueJobs: 'Overdue jobs',
        kpiCompletedJobs: 'Completed (30d)',
        kpiAvgPci: 'Avg. PCI',
        kpiPendingRecommendations: 'Pending recommendations',
        lastUpdated: 'Last updated',
      },
      actions: {
        refresh: 'Refresh',
        create: 'Create',
        save: 'Save',
        cancel: 'Cancel',
        submit: 'Submit',
      },
      feedback: {
        loading: 'Loading data…',
        empty: 'Nothing to show yet.',
        error: 'We could not load this data. Please try again.',
        retry: 'Retry',
      },
      forms: {
        required: 'This field is required',
        invalidEmail: 'Enter a valid email address',
        minLength: 'Enter at least {{count}} characters',
      },
      properties: {
        title: 'Properties',
        name: 'Name',
        type: 'Type',
        city: 'City',
        country: 'Country',
        createTitle: 'New property',
      },
      propertyDetail: {
        units: 'Units',
        addUnit: 'Add unit',
        unitName: 'Unit name',
        floor: 'Floor',
        area: 'Area (sqm)',
      },
      plans: {
        title: 'Maintenance plans',
        name: 'Plan name',
        frequency: 'Frequency',
      },
      inspections: {
        title: 'Inspections',
        scheduledOn: 'Scheduled on',
        inspector: 'Inspector',
      },
      jobs: {
        title: 'Jobs',
        status: 'Status',
        assignedTo: 'Assigned to',
      },
      serviceRequests: {
        title: 'Service requests',
        subtitle: 'Track tenant issues and prioritise follow-up.',
        overdue: 'Overdue',
        noDueDate: 'No due date',
        days: 'days',
        columns: {
          request: 'Request',
          property: 'Property',
          priority: 'Priority',
          age: 'Age',
          status: 'Status',
          due: 'Due date',
        },
      },
      recommendations: {
        title: 'Recommendations',
        priority: 'Priority',
      },
      subscriptions: {
        title: 'Subscriptions',
        status: 'Status',
        plan: 'Plan',
      },
      reports: {
        title: 'Reports',
        description: 'Request an owner report for a property and date range.',
        property: 'Property',
        from: 'From',
        to: 'To',
        submit: 'Request report',
        success: 'The report request was submitted successfully.',
      },
    },
  },
  ar: {
    translation: {
      brand: 'إيجنت إف إم',
      navigation: {
        dashboard: 'لوحة التحكم',
        properties: 'العقارات',
        propertyDetail: 'تفاصيل العقار',
        plans: 'الخطط',
        inspections: 'التفتيشات',
        jobs: 'الوظائف',
        serviceRequests: 'طلبات الخدمة',
        recommendations: 'التوصيات',
        subscriptions: 'الاشتراكات',
        reports: 'التقارير',
      },
      dashboard: {
        title: 'نظرة عامة على العمليات',
        kpiOpenJobs: 'الوظائف المفتوحة',
        kpiOverdueJobs: 'الوظائف المتأخرة',
        kpiCompletedJobs: 'المكتملة (30 يوماً)',
        kpiAvgPci: 'متوسط PCI',
        kpiPendingRecommendations: 'التوصيات المعلقة',
        lastUpdated: 'آخر تحديث',
      },
      actions: {
        refresh: 'تحديث',
        create: 'إنشاء',
        save: 'حفظ',
        cancel: 'إلغاء',
        submit: 'إرسال',
      },
      feedback: {
        loading: 'جار تحميل البيانات…',
        empty: 'لا توجد بيانات للعرض بعد.',
        error: 'تعذر تحميل البيانات. يرجى المحاولة مرة أخرى.',
        retry: 'إعادة المحاولة',
      },
      forms: {
        required: 'هذا الحقل مطلوب',
        invalidEmail: 'أدخل بريداً إلكترونياً صحيحاً',
        minLength: 'أدخل على الأقل {{count}} أحرف',
      },
      properties: {
        title: 'العقارات',
        name: 'الاسم',
        type: 'النوع',
        city: 'المدينة',
        country: 'الدولة',
        createTitle: 'عقار جديد',
      },
      propertyDetail: {
        units: 'الوحدات',
        addUnit: 'إضافة وحدة',
        unitName: 'اسم الوحدة',
        floor: 'الطابق',
        area: 'المساحة (م٢)',
      },
      plans: {
        title: 'خطط الصيانة',
        name: 'اسم الخطة',
        frequency: 'التكرار',
      },
      inspections: {
        title: 'التفتيشات',
        scheduledOn: 'تاريخ الجدولة',
        inspector: 'المفتش',
      },
      jobs: {
        title: 'الوظائف',
        status: 'الحالة',
        assignedTo: 'المسؤول',
      },
      serviceRequests: {
        title: 'طلبات الخدمة',
        subtitle: 'تابع ملاحظات المستأجرين وحدد الأولويات.',
        overdue: 'متأخر',
        noDueDate: 'لا يوجد تاريخ استحقاق',
        days: 'أيام',
        columns: {
          request: 'الطلب',
          property: 'العقار',
          priority: 'الأولوية',
          age: 'العمر',
          status: 'الحالة',
          due: 'تاريخ الاستحقاق',
        },
      },
      recommendations: {
        title: 'التوصيات',
        priority: 'الأولوية',
      },
      subscriptions: {
        title: 'الاشتراكات',
        status: 'الحالة',
        plan: 'الخطة',
      },
      reports: {
        title: 'التقارير',
        description: 'اطلب تقريراً للمالك لعقار وفترة زمنية.',
        property: 'العقار',
        from: 'من',
        to: 'إلى',
        submit: 'طلب التقرير',
        success: 'تم إرسال طلب التقرير بنجاح.',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
